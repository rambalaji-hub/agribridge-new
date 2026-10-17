import React, { useEffect, useState } from 'react';
import { AlertCircle, Building2, LoaderCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { centreMapText } from '../../i18n/centreMapTranslations';
import { ProcurementCentre } from '../../types';
import { listCentres } from '../../lib/api';
import { ProcurementCentreMap } from './ProcurementCentreMap';

export const FarmerCentresView: React.FC = () => {
  const { currentUser, bookSlotAtCentre, language, tD } = useApp();
  const [centres, setCentres] = useState<ProcurementCentre[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const text = (key: Parameters<typeof centreMapText>[1]) => centreMapText(language, key);
  const initialAddress = [currentUser?.location, currentUser?.district, currentUser?.state, 'India']
    .filter(Boolean)
    .join(', ');

  useEffect(() => {
    let active = true;
    const refreshCentres = async () => {
      try {
        const databaseCentres = await listCentres();
        if (!active) return;
        setCentres(databaseCentres);
        setUpdatedAt(new Date());
        setLoadError('');
      } catch (error) {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : text('centreLoadError'));
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void refreshCentres();
    const intervalId = window.setInterval(refreshCentres, 60000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-black border border-slate-200/90 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <Building2 className="w-3.5 h-3.5" />
          {tD('apmcDirectoryBadge')}
        </span>
        <h1 className="font-heading text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-2">
          {text('title')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{text('description')}</p>
      </div>

      {loadError && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{text('centreLoadError')}</p>
            <p className="mt-0.5">{loadError}</p>
          </div>
        </div>
      )}

      {isLoading && (
        <div role="status" className="flex items-center gap-2 rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
          <LoaderCircle className="w-4 h-4 animate-spin" />
          {text('loadingCentres')}
        </div>
      )}

      <ProcurementCentreMap
        centres={centres}
        initialAddress={initialAddress}
        updatedAt={updatedAt}
        onBookSlot={bookSlotAtCentre}
      />
    </div>
  );
};
