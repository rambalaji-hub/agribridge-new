import { ProcurementBooking, ProcurementCentre, ProfileUpdate, UserProfile } from '../types';

let accessToken: string | null = null;

export class ApiRequestError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export async function advanceQueue(centreId: string): Promise<void> {
  await request(`/api/centres/${encodeURIComponent(centreId)}/queue/advance`, { method: 'POST', body: '{}' });
}

export async function approveBooking(bookingId: string): Promise<void> {
  await request(`/api/bookings/${encodeURIComponent(bookingId)}/approve`, { method: 'POST', body: '{}' });
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const response = await fetch(path, { ...options, headers });
  const body = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) {
    throw new ApiRequestError(body?.error || `Request failed (${response.status}).`, response.status);
  }
  return body as T;
}

export async function login(identifier: string, password: string): Promise<UserProfile> {
  const result = await request<{ user: UserProfile; token: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
  accessToken = result.token;
  return result.user;
}

export async function updateProfile(profile: ProfileUpdate): Promise<UserProfile> {
  const { avatarUrl, ...profileFields } = profile;
  return request('/api/profile', {
    method: 'PATCH',
    body: JSON.stringify({
      ...profileFields,
      ...(avatarUrl !== undefined ? { avatarData: avatarUrl } : {}),
    }),
  });
}

export async function register(user: UserProfile, password: string): Promise<UserProfile> {
  const result = await request<{ user: UserProfile; token: string }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: user.name,
      identifier: user.identifier,
      mobile: user.mobile,
      email: user.email,
      password,
      location: user.location,
      state: user.state,
      district: user.district,
      landAcres: user.landAcres,
      primaryCrops: user.primaryCrops,
      accountNumber: user.accountNumber,
      ifscCode: user.ifscCode,
    }),
  });
  accessToken = result.token;
  return result.user;
}

export function logout(): void {
  accessToken = null;
}

export function hasApiSession(): boolean {
  return accessToken !== null;
}

export function localDateString(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function listCentres(): Promise<ProcurementCentre[]> {
  return request('/api/centres');
}

export interface MapCoordinate {
  lat: number;
  lng: number;
}

export interface MapLocation extends MapCoordinate {
  formattedAddress: string;
}

export interface RoadRoute {
  centreId: string;
  distanceMeters: number;
  durationSeconds: number;
}

export async function geocodeMapLocation(input: { address: string } | MapCoordinate): Promise<MapLocation> {
  return request('/api/maps/geocode', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getRoadRoutes(
  origin: MapCoordinate,
  destinations: Array<{ centreId: string } & MapCoordinate>
): Promise<RoadRoute[]> {
  return request('/api/maps/routes', {
    method: 'POST',
    body: JSON.stringify({ origin, destinations }),
  });
}

export function findFarmer(query: string): Promise<UserProfile> {
  return request(`/api/farmers/search?${new URLSearchParams({ query })}`);
}

export function listBookings(): Promise<ProcurementBooking[]> {
  return request('/api/bookings');
}

export async function createBooking(input: Partial<ProcurementBooking>): Promise<ProcurementBooking> {
  const displayDate = input.bookingDate || localDateString();
  const dateValue = displayDate.includes(',') ? displayDate.slice(displayDate.indexOf(',') + 1).trim() : displayDate;
  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) throw new Error('Choose a valid procurement date.');
  const bookingDate = /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
    ? dateValue
    : `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`;
  const result = await request<ProcurementBooking>('/api/bookings', {
    method: 'POST',
    body: JSON.stringify({
      crop: input.crop,
      quantityQuintals: input.quantityQuintals,
      farmerId: input.farmerId,
      farmerMobile: input.farmerMobile,
      centreId: input.centreId,
      bookingDate,
      slotTime: input.slotTime,
      notes: input.notes,
      cropDetails: { estimatedQuantityQuintals: input.quantityQuintals },
    }),
  });
  return result;
}

export async function updateBookingStatus(bookingId: string, status: string, rejectionReason?: string): Promise<void> {
  await request(`/api/bookings/${encodeURIComponent(bookingId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, rejectionReason }),
  });
}

export async function recordQuality(bookingId: string, input: {
  moisturePercentage: number;
  foreignMatterPercentage: number;
  grade: string;
  remarks?: string;
}): Promise<void> {
  await request(`/api/bookings/${encodeURIComponent(bookingId)}/quality`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function recordWeighSlip(bookingId: string, input: {
  grossWeightKg: number;
  tareWeightKg: number;
  deductionPercentage: number;
  vehicleNumber?: string;
}): Promise<void> {
  await request(`/api/bookings/${encodeURIComponent(bookingId)}/weigh-slip`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function processPayment(bookingId: string): Promise<void> {
  await request(`/api/bookings/${encodeURIComponent(bookingId)}/payment`, { method: 'POST', body: '{}' });
}

export async function listTransactions(): Promise<unknown[]> {
  return request('/api/transactions');
}
