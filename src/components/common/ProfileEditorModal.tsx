import React, { FormEvent, useRef, useState } from 'react';
import { Camera, LoaderCircle, Save, Trash2, UserRound, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { profileText } from '../../i18n/profileTranslations';
import { ProfileUpdate, UserProfile } from '../../types';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_STORED_BYTES = 350 * 1024;

function compressProfileImage(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > MAX_UPLOAD_BYTES) {
    return Promise.reject(new Error('invalid-image'));
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('image-processing'));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if (!blob || blob.size > MAX_STORED_BYTES) {
          reject(new Error('image-processing'));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string'
          ? resolve(reader.result)
          : reject(new Error('image-processing'));
        reader.onerror = () => reject(new Error('image-processing'));
        reader.readAsDataURL(blob);
      }, 'image/jpeg', 0.82);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('image-processing'));
    };
    image.src = objectUrl;
  });
}

function roleProfileFields(user: UserProfile) {
  if (user.role === 'farmer') {
    return ['landAcres', 'primaryCrops'] as const;
  }
  if (user.role === 'buyer') {
    return ['gstin', 'tradeCategory'] as const;
  }
  if (user.role === 'assisted') {
    return ['cscKioskId'] as const;
  }
  if (user.role === 'officer' || user.role === 'admin') {
    return ['govCadre'] as const;
  }
  return [];
}

export const ProfileEditorModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { currentUser, language, updateUserProfile } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(currentUser?.name || '');
  const [mobile, setMobile] = useState(currentUser?.mobile || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [location, setLocation] = useState(currentUser?.location || '');
  const [district, setDistrict] = useState(currentUser?.district || '');
  const [state, setState] = useState(currentUser?.state || '');
  const [landAcres, setLandAcres] = useState(currentUser?.landAcres?.toString() || '');
  const [primaryCrops, setPrimaryCrops] = useState(currentUser?.primaryCrops?.join(', ') || '');
  const [gstin, setGstin] = useState(currentUser?.gstin || '');
  const [tradeCategory, setTradeCategory] = useState(currentUser?.tradeCategory || '');
  const [cscKioskId, setCscKioskId] = useState(currentUser?.cscKioskId || '');
  const [govCadre, setGovCadre] = useState(currentUser?.govCadre || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentUser?.avatarUrl || null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const text = (key: Parameters<typeof profileText>[1]) => profileText(language, key);
  const editableRoleFields = currentUser ? roleProfileFields(currentUser) : [];

  if (!currentUser) return null;

  const handleImageSelection = async (file?: File) => {
    if (!file) return;
    setError('');
    setSaved(false);
    try {
      setAvatarUrl(await compressProfileImage(file));
    } catch (imageError) {
      setError(imageError instanceof Error && imageError.message === 'invalid-image'
        ? text('imageError')
        : text('resizeError'));
    }
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSaved(false);
    setIsSaving(true);

    const profile: ProfileUpdate = {
      name: name.trim(),
      mobile: mobile.trim(),
      email: email.trim(),
      location: location.trim(),
      district: district.trim(),
      state: state.trim(),
      avatarUrl,
    };
    if (currentUser.role === 'farmer') {
      profile.landAcres = landAcres.trim() ? Number(landAcres) : null;
      profile.primaryCrops = primaryCrops.split(',').map(crop => crop.trim()).filter(Boolean);
    } else if (currentUser.role === 'buyer') {
      profile.gstin = gstin.trim() || null;
      profile.tradeCategory = tradeCategory.trim() || null;
    } else if (currentUser.role === 'assisted') {
      profile.cscKioskId = cscKioskId.trim() || null;
    } else if (currentUser.role === 'officer' || currentUser.role === 'admin') {
      profile.govCadre = govCadre.trim() || null;
    }

    try {
      await updateUserProfile(profile);
      setSaved(true);
    } catch (saveError) {
      console.error('Profile update failed:', saveError);
      setError(saveError instanceof Error ? saveError.message : text('saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = 'mt-1 min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-600 dark:border-white/10 dark:bg-neutral-900 dark:text-white';
  const renderField = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    options: { type?: string; required?: boolean; min?: string; max?: string } = {}
  ) => (
    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
      {label}
      <input
        type={options.type || 'text'}
        value={value}
        onChange={event => onChange(event.target.value)}
        required={options.required}
        min={options.min}
        max={options.max}
        className={inputClass}
      />
    </label>
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !isSaving) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-editor-title"
        className="max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-black sm:rounded-2xl"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white/95 p-4 backdrop-blur dark:border-white/10 dark:bg-black/95 sm:p-5">
          <div>
            <h2 id="profile-editor-title" className="font-heading text-xl font-bold text-slate-900 dark:text-white">{text('title')}</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{text('description')}</p>
          </div>
          <button type="button" onClick={onClose} disabled={isSaving} aria-label={text('cancel')} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-neutral-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-5 p-4 sm:p-5">
          <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4 dark:bg-neutral-900">
            {avatarUrl
              ? <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full border border-slate-200 object-cover dark:border-white/10" />
              : <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"><UserRound className="h-8 w-8" /></div>}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{text('photo')}</p>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{text('photoHint')}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-black dark:text-slate-200 dark:ring-white/10">
                  <Camera className="h-3.5 w-3.5" />{text('changePhoto')}
                </button>
                {avatarUrl && (
                  <button type="button" onClick={() => setAvatarUrl(null)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40">
                    <Trash2 className="h-3.5 w-3.5" />{text('removePhoto')}
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={event => {
                  void handleImageSelection(event.currentTarget.files?.[0]);
                  event.currentTarget.value = '';
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {renderField(text('name'), name, setName, { required: true })}
            {renderField(text('mobile'), mobile, setMobile, { required: true, type: 'tel' })}
            {renderField(text('email'), email, setEmail, { type: 'email' })}
            {renderField(text('location'), location, setLocation, { required: true })}
            {renderField(text('district'), district, setDistrict, { required: true })}
            {renderField(text('state'), state, setState, { required: true })}
            {editableRoleFields.includes('landAcres') && renderField(text('landAcres'), landAcres, setLandAcres, { type: 'number', min: '0.01', max: '100000' })}
            {editableRoleFields.includes('primaryCrops') && (
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 sm:col-span-2">
                {text('primaryCrops')}
                <textarea value={primaryCrops} onChange={event => setPrimaryCrops(event.target.value)} rows={2} className={`${inputClass} py-2`} />
              </label>
            )}
            {editableRoleFields.includes('gstin') && renderField(text('gstin'), gstin, setGstin)}
            {editableRoleFields.includes('tradeCategory') && renderField(text('tradeCategory'), tradeCategory, setTradeCategory)}
            {editableRoleFields.includes('cscKioskId') && renderField(text('cscKioskId'), cscKioskId, setCscKioskId)}
            {editableRoleFields.includes('govCadre') && renderField(text('govCadre'), govCadre, setGovCadre)}
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400">{text('roleNotice')}</p>
          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{error}</p>}
          {saved && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">{text('saved')}</p>}

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 dark:border-white/10 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={isSaving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-neutral-900">
              {text('cancel')}
            </button>
            <button type="submit" disabled={isSaving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-60">
              {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? text('saving') : text('save')}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
