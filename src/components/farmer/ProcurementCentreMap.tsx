import React, { useEffect, useMemo, useRef, useState } from 'react';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { AlertCircle, CalendarClock, Clock3, LocateFixed, MapPin, Navigation, Route, Sprout } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { centreMapText } from '../../i18n/centreMapTranslations';
import { ProcurementCentre } from '../../types';
import { geocodeMapLocation, getRoadRoutes, MapCoordinate, RoadRoute } from '../../lib/api';

interface SelectedLocation extends MapCoordinate {
  address: string;
}

interface ProcurementCentreMapProps {
  centres: ProcurementCentre[];
  initialAddress: string;
  updatedAt: Date | null;
  onBookSlot: (centreId: string) => void;
}

const SEARCH_RADII = [5, 10, 25, 50] as const;
const MAP_LANGUAGE: Record<string, string> = {
  en: 'en',
  ta: 'ta',
  hi: 'hi',
  te: 'te',
  kn: 'kn',
  ml: 'ml',
  mr: 'mr',
};

let mapsConfigured = false;
let mapsLoading: Promise<void> | null = null;

function loadGoogleMaps(apiKey: string, language: string): Promise<void> {
  if (!mapsLoading) {
    if (!mapsConfigured) {
      setOptions({ key: apiKey, v: 'weekly', language: MAP_LANGUAGE[language] || 'en', region: 'IN' });
      mapsConfigured = true;
    }
    mapsLoading = Promise.all([
      importLibrary('maps'),
      importLibrary('places'),
    ]).then(() => undefined);
  }
  return mapsLoading;
}

function coordinateOf(centre: ProcurementCentre): MapCoordinate | null {
  if (
    centre.lat === null ||
    centre.lng === null ||
    !Number.isFinite(centre.lat) ||
    !Number.isFinite(centre.lng)
  ) return null;
  return { lat: centre.lat, lng: centre.lng };
}

function distanceBetween(first: MapCoordinate, second: MapCoordinate): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(second.lat - first.lat);
  const longitudeDelta = radians(second.lng - first.lng);
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(first.lat)) * Math.cos(radians(second.lat)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function distanceLabel(meters: number, unit: string): string {
  return `${(meters / 1000).toFixed(1)} ${unit}`;
}

function durationLabel(seconds: number, minuteUnit: string, hourUnit: string): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} ${minuteUnit}`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes
    ? `${hours} ${hourUnit} ${remainingMinutes} ${minuteUnit}`
    : `${hours} ${hourUnit}`;
}

export const ProcurementCentreMap: React.FC<ProcurementCentreMapProps> = ({
  centres,
  initialAddress,
  updatedAt,
  onBookSlot,
}) => {
  const { language, localizeCrop } = useApp();
  const text = (key: Parameters<typeof centreMapText>[1]) => centreMapText(language, key);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const mapElementRef = useRef<HTMLDivElement>(null);
  const autocompleteHostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const geocodeRequestRef = useRef(0);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState('');
  const [routeError, setRouteError] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [routeByCentre, setRouteByCentre] = useState<Map<string, RoadRoute>>(new Map());
  const [searchRadiusKm, setSearchRadiusKm] = useState<number>(10);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [demoFilter, setDemoFilter] = useState('');
  const [selectedDemoCentreId, setSelectedDemoCentreId] = useState<string | null>(centres[0]?.id || null);

  const locatedCentres = useMemo(() => centres.flatMap(centre => {
    const coordinate = coordinateOf(centre);
    return coordinate ? [{ centre, coordinate }] : [];
  }), [centres]);

  const nearbyCentres = useMemo(() => {
    if (!selectedLocation) return [];
    const candidates = locatedCentres
      .map(({ centre, coordinate }) => ({
        centre,
        coordinate,
        straightDistanceKm: distanceBetween(selectedLocation, coordinate),
        roadRoute: routeByCentre.get(centre.id),
      }))
      .filter(item => item.straightDistanceKm <= searchRadiusKm);
    const allHaveRoadRoutes = candidates.length > 0 && candidates.every(item => item.roadRoute);
    return candidates.sort((first, second) => allHaveRoadRoutes
      ? first.roadRoute!.distanceMeters - second.roadRoute!.distanceMeters
      : first.straightDistanceKm - second.straightDistanceKm);
  }, [locatedCentres, routeByCentre, searchRadiusKm, selectedLocation]);

  const demoCentres = useMemo(() => {
    const query = demoFilter.trim().toLocaleLowerCase();
    if (!query) return centres;
    return centres.filter(centre => [
      centre.name,
      centre.code,
      centre.taluk,
      centre.district,
      centre.state,
      centre.pincode,
      ...centre.supportedCrops,
    ].some(value => value.toLocaleLowerCase().includes(query)));
  }, [centres, demoFilter]);
  const selectedDemoCentre = demoCentres.find(centre => centre.id === selectedDemoCentreId) || demoCentres[0] || null;
  const demoMarkerPositions = useMemo(() => demoCentres.map((_centre, index) => {
    const angle = (index * 2 * Math.PI) / Math.max(demoCentres.length, 3) - Math.PI / 2;
    return {
      left: `${50 + Math.cos(angle) * 32}%`,
      top: `${50 + Math.sin(angle) * 28}%`,
    };
  }), [demoCentres]);

  useEffect(() => {
    if (!demoCentres.some(centre => centre.id === selectedDemoCentreId)) {
      setSelectedDemoCentreId(demoCentres[0]?.id || null);
    }
  }, [demoCentres, selectedDemoCentreId]);

  useEffect(() => {
    if (!apiKey) {
      setMapError(text('configureMap'));
      return;
    }

    let active = true;
    void loadGoogleMaps(apiKey, language).then(async () => {
      if (!active || !mapElementRef.current) return;
      const mapsLibrary = await importLibrary('maps') as google.maps.MapsLibrary;
      const map = new mapsLibrary.Map(mapElementRef.current, {
        center: selectedLocation || locatedCentres[0]?.coordinate || { lat: 20.5937, lng: 78.9629 },
        zoom: selectedLocation || locatedCentres[0] ? 10 : 5,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        clickableIcons: false,
      });
      mapRef.current = map;
      setMapReady(true);

      if (!autocompleteHostRef.current) return;
      const placesLibrary = await importLibrary('places') as google.maps.PlacesLibrary;
      const autocomplete = new placesLibrary.PlaceAutocompleteElement({
        includedRegionCodes: ['in'],
        placeholder: text('searchPlaceholder'),
      });
      autocomplete.className = 'w-full';
      autocomplete.setAttribute('aria-label', text('searchPlaceholder'));
      const handleSelection = async (event: google.maps.places.PlacePredictionSelectEvent) => {
        geocodeRequestRef.current += 1;
        setLocationError('');
        try {
          const place = event.placePrediction.toPlace();
          await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
          if (!place.location) {
            setLocationError(text('locationSearchError'));
            return;
          }
          const point = { lat: place.location.lat(), lng: place.location.lng() };
          setSelectedLocation({
            ...point,
            address: place.formattedAddress || place.displayName || text('selectedLocation'),
          });
          map.panTo(point);
          map.setZoom(11);
        } catch (error) {
          console.error('Google Places could not resolve the selected location:', error);
          setLocationError(text('locationSearchError'));
        }
      };
      autocomplete.addEventListener('gmp-select', handleSelection);
      autocompleteHostRef.current.replaceChildren(autocomplete);
    }).catch(error => {
      console.error('Google Maps initialization failed:', error);
      if (active) setMapError(text('mapError'));
    });

    return () => {
      active = false;
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      mapRef.current = null;
    };
  }, [apiKey]);

  useEffect(() => {
    if (!apiKey || !initialAddress.trim() || selectedLocation) return;
    const requestId = ++geocodeRequestRef.current;
    void geocodeMapLocation({ address: initialAddress })
      .then(result => {
        if (geocodeRequestRef.current !== requestId) return;
        setSelectedLocation({ lat: result.lat, lng: result.lng, address: result.formattedAddress || initialAddress });
      })
      .catch(error => {
        if (geocodeRequestRef.current === requestId) {
          console.warn('Could not geocode the farmer profile location:', error);
          setLocationError(text('geocodeUnavailable'));
        }
      });
  }, [apiKey, initialAddress, language, selectedLocation]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    if (selectedLocation) {
      markersRef.current.push(new google.maps.Marker({
        map: mapRef.current,
        position: selectedLocation,
        title: `${text('farmerMarker')}: ${selectedLocation.address}`,
        label: { text: 'F', color: '#ffffff', fontWeight: '700' },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#2563eb',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        zIndex: 1000,
      }));
    }

    const bounds = new google.maps.LatLngBounds();
    if (selectedLocation) bounds.extend(selectedLocation);
    locatedCentres.forEach(({ centre, coordinate }) => {
      const distance = selectedLocation ? distanceBetween(selectedLocation, coordinate) : Infinity;
      if (distance > searchRadiusKm) return;
      markersRef.current.push(new google.maps.Marker({
        map: mapRef.current,
        position: coordinate,
        title: `${centre.name} (${distanceLabel(distance * 1000, text('km'))} ${text('straightDistance').toLowerCase()})`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: '#047857',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      }));
      bounds.extend(coordinate);
    });

    if (!bounds.isEmpty()) mapRef.current.fitBounds(bounds, 48);
  }, [locatedCentres, mapReady, searchRadiusKm, selectedLocation, language]);

  useEffect(() => {
    if (!selectedLocation || !locatedCentres.length) {
      setRouteByCentre(new Map());
      setRouteError(false);
      return;
    }

    let active = true;
    const routeCandidates = locatedCentres
      .filter(({ coordinate }) => distanceBetween(selectedLocation, coordinate) <= 50)
      .map(({ centre, coordinate }) => ({ centreId: centre.id, ...coordinate }));
    if (!routeCandidates.length) {
      setRouteByCentre(new Map());
      setRouteError(false);
      return;
    }

    setRouteLoading(true);
    setRouteError(false);
    void Promise.all(
      Array.from({ length: Math.ceil(routeCandidates.length / 100) }, (_, index) =>
        getRoadRoutes(selectedLocation, routeCandidates.slice(index * 100, (index + 1) * 100))
      )
    ).then(routeGroups => {
      if (active) setRouteByCentre(new Map(routeGroups.flat().map(route => [route.centreId, route])));
    }).catch(error => {
      console.warn('Google Routes request failed:', error);
      if (active) {
        setRouteByCentre(new Map());
        setRouteError(true);
      }
    }).finally(() => {
      if (active) setRouteLoading(false);
    });

    return () => { active = false; };
  }, [locatedCentres, selectedLocation]);

  const handleUseCurrentLocation = () => {
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError(text('locationUnavailable'));
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(async position => {
      const point = { lat: position.coords.latitude, lng: position.coords.longitude };
      geocodeRequestRef.current += 1;
      const requestId = geocodeRequestRef.current;
      setSelectedLocation({ ...point, address: text('currentLocation') });
      mapRef.current?.panTo(point);
      mapRef.current?.setZoom(13);
      try {
        const result = await geocodeMapLocation(point);
        if (geocodeRequestRef.current === requestId) {
          setSelectedLocation({ ...point, address: result.formattedAddress || text('currentLocation') });
        }
      } catch (error) {
        console.warn('Reverse geocoding the current location failed:', error);
        if (geocodeRequestRef.current === requestId) setLocationError(text('geocodeUnavailable'));
      } finally {
        setLocationLoading(false);
      }
    }, error => {
      setLocationLoading(false);
      setLocationError(error.code === error.PERMISSION_DENIED
        ? text('locationPermission')
        : text('locationUnavailable'));
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  };

  const directionsUrl = (coordinate: MapCoordinate) => {
    const url = new URL('https://www.google.com/maps/dir/');
    if (selectedLocation) {
      url.searchParams.set('api', '1');
      url.searchParams.set('origin', `${selectedLocation.lat},${selectedLocation.lng}`);
      url.searchParams.set('destination', `${coordinate.lat},${coordinate.lng}`);
      url.searchParams.set('travelmode', 'driving');
    }
    return url.toString();
  };

  if (!apiKey) {
    return (
      <section className="space-y-4" aria-labelledby="procurement-map-heading">
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:p-5 dark:border-amber-900 dark:bg-amber-950/30">
          <span className="inline-flex items-center rounded-full bg-amber-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-950 dark:bg-amber-900 dark:text-amber-100">
            {text('demoLabel')}
          </span>
          <p className="mt-2 text-sm leading-relaxed text-amber-950 dark:text-amber-100">{text('demoDescription')}</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-black">
          <div className="relative min-h-[420px] overflow-hidden bg-[#e9f0e5] p-3 dark:bg-[#18221d] sm:min-h-[470px] sm:p-5">
            <div
              className="absolute inset-0 opacity-70"
              style={{
                backgroundImage: 'radial-gradient(ellipse at 15% 24%, rgba(134,181,128,.28) 0 9%, transparent 9.5%), radial-gradient(ellipse at 83% 73%, rgba(134,181,128,.24) 0 12%, transparent 12.5%), linear-gradient(35deg, transparent 0 45%, rgba(191,220,236,.55) 45% 51%, transparent 51.5%), linear-gradient(rgba(100,116,139,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(100,116,139,.07) 1px, transparent 1px)',
                backgroundSize: '100% 100%, 100% 100%, 100% 100%, 32px 32px, 32px 32px',
              }}
            />
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 1200 560"
              preserveAspectRatio="xMidYMid slice"
              aria-hidden="true"
            >
              <path d="M-40 105 C170 148 248 35 420 94 S695 178 870 87 S1080 68 1240 104" fill="none" stroke="#ffffff" strokeWidth="30" />
              <path d="M-40 105 C170 148 248 35 420 94 S695 178 870 87 S1080 68 1240 104" fill="none" stroke="#c8bda7" strokeWidth="3" strokeDasharray="10 12" />
              <path d="M70 590 C198 454 150 335 318 245 S532 202 626 324 S884 489 1110 385" fill="none" stroke="#ffffff" strokeWidth="23" />
              <path d="M70 590 C198 454 150 335 318 245 S532 202 626 324 S884 489 1110 385" fill="none" stroke="#d2c7b4" strokeWidth="2.5" strokeDasharray="8 10" />
              <path d="M204 -40 C256 115 509 148 595 246 S674 400 812 616" fill="none" stroke="#ffffff" strokeWidth="18" />
              <path d="M204 -40 C256 115 509 148 595 246 S674 400 812 616" fill="none" stroke="#d8ceb9" strokeWidth="2" strokeDasharray="7 9" />
              <path d="M-20 416 C145 383 269 465 411 420 S665 333 787 380 S1021 522 1225 456" fill="none" stroke="#ffffff" strokeWidth="14" />
              <path d="M-20 416 C145 383 269 465 411 420 S665 333 787 380 S1021 522 1225 456" fill="none" stroke="#d8ceb9" strokeWidth="2" strokeDasharray="7 9" />
              <path d="M852 -35 C805 96 901 194 1040 228 S1160 326 1227 354" fill="none" stroke="#b5d5e3" strokeWidth="34" opacity=".7" />
              <path d="M852 -35 C805 96 901 194 1040 228 S1160 326 1227 354" fill="none" stroke="#d9edf4" strokeWidth="22" opacity=".9" />
              <g fill="#7ca876" opacity=".65">
                <circle cx="83" cy="208" r="20" /><circle cx="118" cy="194" r="13" /><circle cx="94" cy="242" r="12" />
                <circle cx="1076" cy="482" r="19" /><circle cx="1110" cy="465" r="13" /><circle cx="1131" cy="496" r="11" />
                <circle cx="702" cy="84" r="14" /><circle cx="727" cy="69" r="11" /><circle cx="739" cy="98" r="13" />
                <circle cx="421" cy="506" r="15" /><circle cx="447" cy="489" r="12" /><circle cx="451" cy="518" r="10" />
              </g>
              <g fill="#8b8071" fontFamily="system-ui, sans-serif" fontSize="13" fontWeight="600" opacity=".8">
                <text x="490" y="150">AGRI MARKET ROAD</text>
                <text x="905" y="318" transform="rotate(21 905 318)">PROCUREMENT LINK</text>
                <text x="105" y="330" transform="rotate(-37 105 330)">VILLAGE ROAD</text>
              </g>
            </svg>

            <div className="absolute left-3 right-3 top-3 z-10 flex flex-col gap-2 sm:left-5 sm:right-5 sm:top-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-2xl rounded-xl border border-white/70 bg-white/95 p-3 shadow-lg dark:border-white/10 dark:bg-black/90">
                <h2 className="font-heading text-base font-bold text-slate-900 dark:text-white">{text('demoMapTitle')}</h2>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">{text('demoMapDescription')}</p>
              </div>
              <span className="inline-flex w-fit shrink-0 rounded-full bg-amber-200 px-2.5 py-1 text-[10px] font-bold text-amber-950 shadow dark:bg-amber-900 dark:text-amber-100">
                {text('demoLabel')}
              </span>
            </div>

            {demoCentres.map((centre, index) => {
              const isSelected = centre.id === selectedDemoCentre?.id;
              const position = demoMarkerPositions[index];
              return (
                <button
                  key={centre.id}
                  type="button"
                  onClick={() => setSelectedDemoCentreId(centre.id)}
                  aria-label={`${text('demoPin')} ${index + 1}: ${centre.name}`}
                  aria-pressed={isSelected}
                  className="absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                  style={position}
                >
                  <span className={`relative grid h-11 w-11 place-items-center rounded-full border-[3px] border-white text-sm font-black text-white shadow-xl transition-all ${
                    isSelected ? 'scale-125 bg-emerald-700 ring-4 ring-emerald-500/30' : 'bg-slate-700 hover:scale-110'
                  }`}>
                    {index + 1}
                    <span className="absolute -bottom-1 h-3 w-3 rotate-45 border-b-[3px] border-r-[3px] border-white bg-inherit" />
                  </span>
                  <span className="mt-1 block max-w-36 truncate rounded-md bg-white/95 px-2 py-1 text-[10px] font-bold text-slate-800 shadow-md dark:bg-black/95 dark:text-white">
                    {centre.name}
                  </span>
                </button>
              );
            })}

            {demoCentres.length === 0 && (
              <p className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white/95 p-4 text-sm text-slate-600 shadow-lg dark:bg-black/90 dark:text-slate-300">
                {centres.length ? text('demoNoMatches') : text('demoNoCentres')}
              </p>
            )}

            {selectedDemoCentre && (
              <div className="absolute bottom-3 left-3 right-3 z-10 rounded-xl border border-emerald-200 bg-white/95 p-3 shadow-lg dark:border-emerald-900 dark:bg-black/90 sm:bottom-5 sm:left-5 sm:right-auto sm:max-w-sm">
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">{text('demoPin')} {selectedDemoCentre.code}</p>
                <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">{selectedDemoCentre.name}</p>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                  {[selectedDemoCentre.taluk, selectedDemoCentre.district, selectedDemoCentre.state, selectedDemoCentre.pincode].filter(Boolean).join(', ')}
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 p-4 dark:border-white/10 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 id="procurement-map-heading" className="font-heading text-lg font-bold text-slate-900 dark:text-white">
                {text('demoCentres')} ({centres.length})
              </h2>
              {updatedAt && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {text('updated')}: {updatedAt.toLocaleString()}
                </p>
              )}
            </div>
            <label className="mt-3 block">
              <span className="sr-only">{text('demoSearch')}</span>
              <input
                type="search"
                value={demoFilter}
                onChange={event => setDemoFilter(event.target.value)}
                placeholder={text('demoSearch')}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 dark:border-white/10 dark:bg-neutral-900 dark:text-white"
              />
            </label>

            {demoCentres.length === 0 ? (
              <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-neutral-900 dark:text-slate-300">
                {centres.length ? text('demoNoMatches') : text('demoNoCentres')}
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
                {demoCentres.map(centre => (
                  <article key={centre.id} className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] text-slate-500">{centre.code}</p>
                        <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white">{centre.name}</h3>
                        <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>{[centre.taluk, centre.district, centre.state, centre.pincode].filter(Boolean).join(', ') || '—'}</span>
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                        {text(centre.operatingStatus === 'Operational'
                          ? 'statusOperational'
                          : centre.operatingStatus === 'High Traffic'
                          ? 'statusHighTraffic'
                          : centre.operatingStatus === 'Maintenance'
                          ? 'statusMaintenance'
                          : 'statusClosed')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedDemoCentreId(centre.id)}
                      aria-pressed={centre.id === selectedDemoCentre?.id}
                      className={`mt-3 text-[11px] font-bold underline underline-offset-2 ${
                        centre.id === selectedDemoCentre?.id
                          ? 'text-emerald-800 dark:text-emerald-300'
                          : 'text-slate-600 hover:text-emerald-700 dark:text-slate-300'
                      }`}
                    >
                      {text('demoSelectCentre')}
                    </button>
                    <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
                      <strong>{text('crops')}:</strong> {centre.supportedCrops.length
                        ? centre.supportedCrops.map(crop => localizeCrop(crop)).join(', ')
                        : '—'}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-white/10">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="block">{text('coordinatesMissing')}</span>
                        <span>{text('roadDistance')}: {text('distanceUnavailable')}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onBookSlot(centre.id)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-emerald-800"
                      >
                        <CalendarClock className="h-4 w-4" />{text('bookSlot')}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4" aria-labelledby="procurement-map-heading">
      <div className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col xl:flex-row gap-3 xl:items-center">
          <div className="flex-1 min-w-0">
            <div ref={autocompleteHostRef} className="google-place-autocomplete w-full min-h-11 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden" />
          </div>
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={locationLoading}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white px-4 py-3 text-xs font-bold transition-colors"
          >
            <LocateFixed className="w-4 h-4" />
            {locationLoading ? text('locating') : text('currentLocation')}
          </button>
          <div className="flex items-center gap-2">
            <label htmlFor="centre-search-radius" className="text-xs text-slate-600 dark:text-slate-300 font-semibold whitespace-nowrap">
              {text('radius')}
            </label>
            <select
              id="centre-search-radius"
              value={searchRadiusKm}
              onChange={event => setSearchRadiusKm(Number(event.target.value))}
              className="min-h-11 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-neutral-900 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              {SEARCH_RADII.map(radius => <option key={radius} value={radius}>{radius} {text('km')}</option>)}
            </select>
          </div>
        </div>

        {locationError && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{locationError}</span>
          </div>
        )}
        {mapError && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{mapError}</span>
          </div>
        )}
        {routeError && (
          <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            {text('routeError')}
          </div>
        )}

        <div className="relative min-h-[300px] sm:min-h-[390px] overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-neutral-900">
          <div ref={mapElementRef} className="absolute inset-0" aria-label={text('nearbyCentres')} />
          {!mapReady && !mapError && (
            <div role="status" className="absolute inset-0 grid place-items-center bg-slate-100/90 dark:bg-neutral-900/90 text-sm text-slate-600 dark:text-slate-300">
              {text('loadingMap')}
            </div>
          )}
          <div className="absolute left-3 top-3 flex flex-wrap gap-2 pointer-events-none">
            {selectedLocation && (
              <span className="max-w-[min(75vw,28rem)] truncate rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-blue-900 shadow-md dark:bg-neutral-950/95 dark:text-blue-200">
                <MapPin className="inline w-3 h-3 mr-1" />{text('selectedLocation')}: {selectedLocation.address}
              </span>
            )}
            {selectedLocation && (
              <span className="rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-md dark:bg-neutral-950/95 dark:text-slate-200">
                {nearbyCentres.length} {text('nearbyCentres').toLowerCase()}
              </span>
            )}
          </div>
          {selectedLocation && (
            <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 pointer-events-none">
              <span className="rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-md dark:bg-neutral-950/95 dark:text-slate-200">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-600 mr-1.5" />{text('farmerMarker')}
              </span>
              <span className="rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-md dark:bg-neutral-950/95 dark:text-slate-200">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-700 mr-1.5" />{text('nearbyCentres')}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <p>{text('mapAttribution')}</p>
          {updatedAt && <p>{text('updated')}: {updatedAt.toLocaleString()}</p>}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 id="procurement-map-heading" className="font-heading text-lg font-bold text-slate-900 dark:text-white">
          {text('nearbyCentres')}
        </h2>
        {routeLoading && (
          <span role="status" className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Route className="w-4 h-4 animate-pulse" />{text('loadingRoutes')}
          </span>
        )}
      </div>

      {!selectedLocation ? (
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black p-5 text-sm text-slate-600 dark:text-slate-300">
          {text('selectLocation')}
        </div>
      ) : nearbyCentres.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black p-5 text-sm text-slate-600 dark:text-slate-300">
          {locatedCentres.length ? text('noNearby') : centres.length ? text('noCoordinates') : text('noCentres')}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {nearbyCentres.map(({ centre, coordinate, straightDistanceKm, roadRoute }) => (
            <article key={centre.id} className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] text-slate-500">{centre.code}</p>
                  <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white">{centre.name}</h3>
                  <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{[centre.taluk, centre.district, centre.state, centre.pincode].filter(Boolean).join(', ') || '—'}</span>
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 px-2.5 py-1 text-[10px] font-bold">
                  {text(centre.operatingStatus === 'Operational'
                    ? 'statusOperational'
                    : centre.operatingStatus === 'High Traffic'
                    ? 'statusHighTraffic'
                    : centre.operatingStatus === 'Maintenance'
                    ? 'statusMaintenance'
                    : 'statusClosed')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-slate-50 dark:bg-neutral-900 p-3">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{text('roadDistance')}</p>
                  <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                    {roadRoute ? distanceLabel(roadRoute.distanceMeters, text('km')) : text('routeUnavailable')}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-neutral-900 p-3">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{text('straightDistance')}</p>
                  <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                    {straightDistanceKm.toFixed(1)} {text('km')}
                  </p>
                </div>
                <div className="col-span-2 rounded-xl bg-slate-50 dark:bg-neutral-900 p-3">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{text('travelTime')}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                    <Clock3 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    {roadRoute ? durationLabel(roadRoute.durationSeconds, text('minutes'), text('hours')) : text('routeUnavailable')}
                  </p>
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-100 dark:border-white/10 pt-3 text-xs">
                <p className="flex items-start gap-1.5 text-slate-600 dark:text-slate-300">
                  <Sprout className="w-4 h-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                  <span><strong>{text('crops')}:</strong> {centre.supportedCrops.length ? centre.supportedCrops.map(crop => localizeCrop(crop)).join(', ') : '—'}</span>
                </p>
                <p className="flex items-start gap-1.5 text-slate-600 dark:text-slate-300">
                  <CalendarClock className="w-4 h-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                  <span><strong>{text('availability')}:</strong> {centre.availableSlotsToday} {text('slots')}</span>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <a
                  href={directionsUrl(coordinate)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-700 px-3 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40 transition-colors"
                >
                  <Navigation className="w-4 h-4" />{text('getDirections')}
                </a>
                <button
                  type="button"
                  onClick={() => onBookSlot(centre.id)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-3 py-2.5 text-xs font-bold text-white transition-colors"
                >
                  <CalendarClock className="w-4 h-4" />{text('bookSlot')}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
