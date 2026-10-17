import React, { useEffect, useState } from 'react';
import { 
  Sprout, 
  Building2, 
  Clock, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  ArrowRight, 
  ChevronRight, 
  Sparkles, 
  ShieldCheck, 
  Ticket, 
  QrCode as QrIcon, 
  Users, 
  Printer, 
  ArrowLeft,
  AlertCircle,
  HelpCircle,
  Scale
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { OFFICIAL_CROPS } from '../../data/mockData';
import { CropType, ProcurementCentre, ProcurementBooking } from '../../types';

export const CropEntryWizard: React.FC = () => {
  const { 
    currentUser, 
    centres, 
    bookingCentreId,
    setBookingCentreId,
    createBooking, 
    setActiveTab, 
    speakText, 
    openDetailDrawer,
    openPrintModal
  } = useApp();

  const dateOptions = Array.from({ length: 3 }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const prefix = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : date.toLocaleDateString('en', { weekday: 'long' });
    return `${prefix}, ${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  });
  const [step, setStep] = useState<number>(1);
  const [selectedCropName, setSelectedCropName] = useState<CropType>('Paddy (Dhan)');
  const [quantity, setQuantity] = useState<number>(65);
  const [unit, setUnit] = useState<string>('Quintals (100 kg)');
  const [harvestDate, setHarvestDate] = useState<string>('September 2026 (Kharif Harvest)');
  const [location, setLocation] = useState<string>(currentUser?.location || 'Taraori Village, Karnal, Haryana');
  const [pincode, setPincode] = useState<string>('132001');
  const [procurementCategory, setProcurementCategory] = useState<string>('Government MSP Official Procurement');
  const [selectedCentreId, setSelectedCentreId] = useState<string>('');
  const [selectedSlotTime, setSelectedSlotTime] = useState<string>('10:30 AM - 12:00 PM');
  const [selectedDate, setSelectedDate] = useState<string>(dateOptions[0]);
  const [generatedBooking, setGeneratedBooking] = useState<ProcurementBooking | null>(null);
  const [bookingError, setBookingError] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    if (bookingCentreId && centres.some(centre => centre.id === bookingCentreId)) {
      setSelectedCentreId(bookingCentreId);
      setBookingCentreId(null);
    } else if (centres.length && !centres.some(centre => centre.id === selectedCentreId)) {
      setSelectedCentreId(centres[0].id);
    }
  }, [bookingCentreId, centres, selectedCentreId, setBookingCentreId]);

  const selectedCrop = OFFICIAL_CROPS.find(c => c.name === selectedCropName) || OFFICIAL_CROPS[0];
  const recommendedCentres = centres.filter(c => c.supportedCrops.includes(selectedCropName));
  const sortedCentres = [...recommendedCentres].sort((a, b) => a.distanceKm - b.distanceKm);
  const bestCentre = sortedCentres[0] || centres[0];

  const handleConfirmBooking = async () => {
    setBookingError('');
    setIsBooking(true);
    try {
      const booking = await createBooking({
        crop: selectedCropName,
        quantityQuintals: quantity,
        centreId: selectedCentreId,
        bookingDate: selectedDate,
        slotTime: selectedSlotTime,
        farmerId: currentUser?.id,
        farmerName: currentUser?.name,
        farmerMobile: currentUser?.mobile,
        notes: `${procurementCategory} allocation under Central Food Grains Quota.`
      });
      setGeneratedBooking(booking);
      setStep(4);
      speakText(`Procurement booking confirmed! Your digital token is ${booking.tokenNumber}. Current queue position is ${booking.queuePosition}.`);
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : 'Could not create the booking. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Wizard Progress Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
              {step}
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {step === 1 && 'Step 1: Enter Crop & Quantity Details'}
              {step === 2 && 'Step 2: Smart Centre Recommendation & Comparison'}
              {step === 3 && 'Step 3: Select Available Slot & Confirm Booking'}
              {step === 4 && 'Step 4: Digital Token & Verifiable QR Generated'}
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Step {step} of 4
          </span>
        </div>

        {/* Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
          <div 
            className="bg-emerald-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* STEP 1: CROP & QUANTITY ENTRY */}
      {step === 1 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Crop Identification
            </span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              Select Crop for Procurement
            </h3>
            <p className="text-xs text-slate-500">
              Choose the verified crop from your seasonal land record registration.
            </p>
          </div>

          {/* Crop Selector with Realistic Agricultural Images */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {OFFICIAL_CROPS.map(crop => {
              const isSelected = selectedCropName === crop.name;
              return (
                <div
                  key={crop.id}
                  onClick={() => setSelectedCropName(crop.name)}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-600/30' 
                      : 'border-slate-200 dark:border-slate-800 hover:border-emerald-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="aspect-video rounded-lg overflow-hidden mb-2 bg-slate-100">
                    <img 
                      src={crop.imageUrl} 
                      alt={crop.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate block">
                      {crop.name}
                    </span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  </div>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold block mt-0.5">
                    MSP: ₹{crop.mspPrice}/Qtl
                  </span>
                </div>
              );
            })}
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Quantity for Procurement
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold focus:outline-none"
                >
                  <option>Quintals (100 kg)</option>
                  <option>Metric Tonnes (MT)</option>
                </select>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Estimated MSP Value: <strong className="text-slate-800 dark:text-slate-200">₹{(quantity * selectedCrop.mspPrice).toLocaleString()}</strong>
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Harvest Date / Season
              </label>
              <input
                type="text"
                value={harvestDate}
                onChange={(e) => setHarvestDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Farm Village & District
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Procurement Channel Category
              </label>
              <select
                value={procurementCategory}
                onChange={(e) => setProcurementCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option>Government MSP Official Procurement</option>
                <option>Price Support Scheme (PSS)</option>
                <option>Market Intervention Scheme (MIS)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <span>Get Smart Centre Recommendations</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: SMART CENTRE RECOMMENDATION & COMPARISON */}
      {step === 2 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
          {/* Algorithmic recommendation banner */}
          <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                  Smart Centre Recommendation Engine
                </span>
                <span className="text-[10px] font-bold px-2 py-0.2 bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 rounded">
                  Active
                </span>
              </div>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1 leading-relaxed">
                Centres evaluated across distance from <strong>{location}</strong>, available daily capacity, live queue length, and crop eligibility for <strong>{selectedCropName}</strong>.
              </p>
              <div className="mt-2 text-[10px] text-slate-500 italic">
                * Note: AI suggestions are recommendations based on real-time APMC telemetry; you may select any authorized centre below.
              </div>
            </div>
          </div>

          {/* Recommended Best Centre Spotlight */}
          <div className="p-5 rounded-2xl border-2 border-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20 relative">
            <div className="absolute -top-3 left-6 px-3 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px] tracking-wider uppercase shadow-xs">
              Top Recommended Centre
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">
                  {bestCentre.name}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Code: {bestCentre.code} &bull; Contact: {bestCentre.contactPerson} ({bestCentre.phone})
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border border-emerald-300">
                {bestCentre.operatingStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 text-[11px] block">Distance</span>
                <span className="font-extrabold text-slate-900 dark:text-white text-sm">{bestCentre.distanceKm} km</span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 text-[11px] block">Current Queue</span>
                <span className="font-extrabold text-slate-900 dark:text-white text-sm">{bestCentre.currentQueueCount} Farmers</span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 text-[11px] block">Est. Waiting Time</span>
                <span className="font-extrabold text-slate-900 dark:text-white text-sm">{bestCentre.averageWaitTimeMinutes} mins</span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 text-[11px] block">Slots Open Today</span>
                <span className="font-extrabold text-emerald-700 dark:text-emerald-400 text-sm">{bestCentre.availableSlotsToday} Slots</span>
              </div>
            </div>
          </div>

          {/* Comparison Matrix of Available Centres */}
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-3">
              Compare All Suitable Centres for {selectedCropName}
            </h4>

            <div className="space-y-3">
              {sortedCentres.map(c => {
                const isSelected = selectedCentreId === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCentreId(c.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-600/20'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                          {c.name}
                        </span>
                        {c.id === bestCentre.id && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                            Fastest
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span>Distance: <strong>{c.distanceKm} km</strong></span>
                        <span>&bull;</span>
                        <span>Queue: <strong>{c.currentQueueCount}</strong></span>
                        <span>&bull;</span>
                        <span>Wait: <strong>{c.averageWaitTimeMinutes}m</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right text-xs">
                        <span className="text-slate-400 block text-[11px]">Available Slots</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{c.availableSlotsToday} Slots</span>
                      </div>
                      <button
                        type="button"
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          isSelected 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <span>Proceed to Slot Selection</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: SELECT SLOT & CONFIRM BOOKING */}
      {step === 3 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Procurement Scheduling
            </span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              Choose Date & Arrival Time Slot
            </h3>
            <p className="text-xs text-slate-500">
              Arrival within your designated window guarantees prioritized weighbridge access and minimal queuing.
            </p>
          </div>

          {/* Date Options */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Procurement Date
            </label>
            <div className="grid grid-cols-3 gap-3 text-xs">
              {dateOptions.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDate(d)}
                  className={`p-3 rounded-xl border text-center font-bold transition-all ${
                    selectedDate === d
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-600/20'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Calendar className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                  <span>{d}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Time Slot Options */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Available Weighbridge Entry Slots
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {[
                { time: '08:30 AM - 10:00 AM', status: 'Few slots left' },
                { time: '10:30 AM - 12:00 PM', status: 'Optimal (Recommended)' },
                { time: '12:30 PM - 02:00 PM', status: 'Open' },
                { time: '02:30 PM - 04:00 PM', status: 'Open' },
              ].map(s => {
                const isSelected = selectedSlotTime === s.time;
                return (
                  <button
                    key={s.time}
                    type="button"
                    onClick={() => setSelectedSlotTime(s.time)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-600/20'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="font-bold block">{s.time}</span>
                    <span className="text-[10px] text-slate-500 mt-1 block">{s.status}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary Confirmation Card */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
              Procurement Summary Confirmation
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-slate-700 dark:text-slate-300">
              <div>Farmer: <strong className="text-slate-900 dark:text-white block">{currentUser?.name}</strong></div>
              <div>Crop: <strong className="text-slate-900 dark:text-white block">{selectedCropName}</strong></div>
              <div>Quantity: <strong className="text-slate-900 dark:text-white block">{quantity} Quintals</strong></div>
              <div>Centre: <strong className="text-slate-900 dark:text-white block">{centres.find(c => c.id === selectedCentreId)?.name}</strong></div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Back
            </button>
            <button
              onClick={handleConfirmBooking}
              disabled={isBooking}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isBooking ? 'Booking…' : 'Confirm & Generate Digital Token'}</span>
            </button>
          </div>
          {bookingError && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{bookingError}</p>}
        </div>
      )}

      {/* STEP 4: DIGITAL TOKEN GENERATED & QR CODE */}
      {step === 4 && generatedBooking && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
            <Ticket className="w-8 h-8" />
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Official Government Procurement Pass
            </span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              Token {generatedBooking.tokenNumber} Active
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Your digital appointment has been entered into the APMC centralized queue. Please present this QR at the gate security weighbridge.
            </p>
          </div>

          {/* QR Code Pass Box */}
          <div className="max-w-sm mx-auto p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="w-44 h-44 bg-white p-3 rounded-xl border border-slate-200 mx-auto shadow-xs flex items-center justify-center">
              <QrIcon className="w-36 h-36 text-slate-900" />
            </div>

            <div className="text-left text-xs space-y-1.5 border-t border-slate-200 dark:border-slate-700 pt-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Queue Position:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">#{generatedBooking.queuePosition}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Estimated Wait:</span>
                <span className="font-bold text-slate-900 dark:text-white">{generatedBooking.estimatedWaitMinutes} mins</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Centre:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[180px]">{generatedBooking.centreName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Slot:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{generatedBooking.slotTime}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setActiveTab('live-queue')}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              <span>Track in Live Queue</span>
            </button>
            <button
              onClick={() => openPrintModal('token', generatedBooking, true)}
              id="wizard-print-gate-pass-btn"
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-2 transition-transform active:scale-95"
            >
              <Printer className="w-4 h-4 text-emerald-600" />
              <span>Print Gate Entry Pass</span>
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className="px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-900 font-semibold text-xs"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
