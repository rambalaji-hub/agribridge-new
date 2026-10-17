import React, { useState } from 'react';
import { BadgeCheck, MapPin, Pencil, Phone, Sprout, UserRound } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { profileText } from '../../i18n/profileTranslations';
import { ProfileEditorModal } from '../common/ProfileEditorModal';

export const FarmerProfileView: React.FC = () => {
  const { currentUser, language, t } = useApp();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const text = (key: Parameters<typeof profileText>[1]) => profileText(language, key);

  if (!currentUser) return null;

  const details = [
    [text('name'), currentUser.name],
    [text('mobile'), currentUser.mobile],
    [text('email'), currentUser.email || '—'],
    [text('location'), currentUser.location],
    [text('district'), currentUser.district],
    [text('state'), currentUser.state],
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-start">
        {currentUser.avatarUrl ? (
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.name}
            className="h-24 w-24 rounded-2xl border-2 border-emerald-500 object-cover shadow-md"
          />
        ) : (
          <div className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl border-2 border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <UserRound className="h-10 w-10" />
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                <h1 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">{currentUser.name}</h1>
                {currentUser.verificationStatus === 'verified' && (
                  <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-600" aria-label="Verified" />
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {t.navMyProfile} ID: <strong className="font-mono">{currentUser.identifier}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsEditorOpen(true)}
              className="inline-flex min-h-10 items-center justify-center gap-2 self-center rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 sm:self-auto"
            >
              <Pencil className="h-4 w-4" />
              {text('title')}
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-slate-600 dark:text-slate-400 sm:justify-start">
            <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-slate-400" />{currentUser.mobile}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-slate-400" />{currentUser.location}, {currentUser.district}</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h2 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900 dark:border-slate-800 dark:text-white">
            <UserRound className="h-4 w-4 text-emerald-600" />
            {text('title')}
          </h2>
          <dl className="space-y-3">
            {details.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 text-xs">
                <dt className="text-slate-500">{label}</dt>
                <dd className="break-words text-right font-semibold text-slate-800 dark:text-slate-200">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h2 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900 dark:border-slate-800 dark:text-white">
            <Sprout className="h-4 w-4 text-emerald-600" />
            {text('landAcres')} / {text('primaryCrops')}
          </h2>
          <dl className="space-y-3">
            <div className="flex justify-between gap-4 text-xs">
              <dt className="text-slate-500">{text('landAcres')}</dt>
              <dd className="text-right font-semibold text-slate-800 dark:text-slate-200">
                {currentUser.landAcres != null ? `${currentUser.landAcres} acres` : '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4 text-xs">
              <dt className="text-slate-500">{text('primaryCrops')}</dt>
              <dd className="text-right font-semibold text-slate-800 dark:text-slate-200">
                {currentUser.primaryCrops?.length ? currentUser.primaryCrops.join(', ') : '—'}
              </dd>
            </div>
          </dl>
          <p className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 dark:bg-neutral-900 dark:text-slate-400">
            {text('roleNotice')}
          </p>
        </section>
      </div>

      {isEditorOpen && <ProfileEditorModal onClose={() => setIsEditorOpen(false)} />}
    </div>
  );
};
