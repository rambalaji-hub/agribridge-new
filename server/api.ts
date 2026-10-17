import { randomUUID } from 'node:crypto';
import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { z } from 'zod';
import { getDatabase } from './database';

type Role = 'farmer' | 'officer' | 'buyer' | 'admin' | 'assisted';
type UserClaims = { id: string; role: Role; identifier: string; assignedCentreId?: string };

declare global {
  namespace Express {
    interface Request {
      user?: UserClaims;
    }
  }
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const asyncRoute = (handler: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res).catch(next);
  };

const requiredText = z.string().trim().min(1).max(255);
const registrationSchema = z.object({
  name: requiredText,
  identifier: z.string().trim().min(3).max(64).optional(),
  mobile: z.string().trim().regex(/^[0-9+() -]{8,20}$/),
  email: z.string().trim().email().max(255).optional().or(z.literal('')),
  password: z.string().min(8).max(128),
  location: requiredText,
  state: requiredText,
  district: requiredText,
  landAcres: z.number().positive().max(100000).optional(),
  primaryCrops: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  accountNumber: z.string().trim().max(64).optional(),
  ifscCode: z.string().trim().max(20).optional(),
});
const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(255),
  password: z.string().min(1).max(128),
});
const profileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  mobile: z.string().trim().regex(/^[0-9+() -]{8,20}$/).optional(),
  email: z.string().trim().email().max(255).or(z.literal('')).optional(),
  location: z.string().trim().min(1).max(255).optional(),
  state: z.string().trim().min(1).max(100).optional(),
  district: z.string().trim().min(1).max(100).optional(),
  landAcres: z.number().positive().max(100000).nullable().optional(),
  primaryCrops: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  avatarData: z.string().regex(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/).max(500000).nullable().optional(),
  gstin: z.string().trim().max(32).nullable().optional(),
  tradeCategory: z.string().trim().max(120).nullable().optional(),
  cscKioskId: z.string().trim().max(64).nullable().optional(),
  govCadre: z.string().trim().max(120).nullable().optional(),
}).strict();
const bookingSchema = z.object({
  crop: requiredText,
  quantityQuintals: z.number().positive().max(100000),
  centreId: z.string().uuid(),
  bookingDate: z.string().date(),
  slotTime: requiredText,
  notes: z.string().max(2000).optional(),
  cropDetails: z.object({
    variety: z.string().trim().max(100).optional(),
    season: z.string().trim().max(40).optional(),
    acreage: z.number().positive().max(100000).optional(),
    estimatedQuantityQuintals: z.number().positive().max(100000).optional(),
    harvestDate: z.string().date().optional(),
  }).optional(),
});
const qualitySchema = z.object({
  moisturePercentage: z.number().min(0).max(100),
  foreignMatterPercentage: z.number().min(0).max(100),
  damagedGrainsPercentage: z.number().min(0).max(100).default(0),
  grade: z.enum(['FAQ (Fair Average Quality)', 'Grade A', 'Sub-Standard']),
  remarks: z.string().max(2000).optional(),
});
const weighSchema = z.object({
  grossWeightKg: z.number().positive(),
  tareWeightKg: z.number().min(0),
  deductionPercentage: z.number().min(0).max(100).default(0),
  vehicleNumber: z.string().trim().max(32).optional(),
});
const cropSchema = z.object({
  cropName: requiredText,
  variety: z.string().trim().max(100).optional(),
  season: z.string().trim().max(40).optional(),
  acreage: z.number().positive().max(100000).optional(),
  estimatedQuantityQuintals: z.number().positive().max(100000).optional(),
  harvestDate: z.string().date().optional(),
});
const coordinateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
const geocodeSchema = z.union([
  z.object({ address: z.string().trim().min(1).max(255) }),
  coordinateSchema,
]);
const routesSchema = z.object({
  origin: coordinateSchema,
  destinations: z.array(z.object({
    centreId: z.string().min(1).max(64),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  })).min(1).max(100),
});
const statusSchema = z.object({
  status: z.enum(['waiting', 'called', 'weighing', 'rejected']),
  rejectionReason: z.string().max(1000).optional(),
});

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ApiError(400, result.error.issues.map(issue => `${issue.path.join('.') || 'request'}: ${issue.message}`).join('; '));
  }
  return result.data;
}

function signToken(user: UserClaims): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new ApiError(503, 'Authentication is unavailable; configure a JWT_SECRET of at least 32 characters.');
  return jwt.sign(user, secret, { expiresIn: '8h', issuer: 'agribridge' });
}

function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authorization = req.header('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  const secret = process.env.JWT_SECRET;
  if (!token || !secret || secret.length < 32) {
    next(new ApiError(401, 'Authentication required.'));
    return;
  }
  try {
    req.user = jwt.verify(token, secret, { issuer: 'agribridge' }) as UserClaims;
    next();
  } catch {
    next(new ApiError(401, 'Session is invalid or expired. Please sign in again.'));
  }
}

function allowRoles(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new ApiError(403, 'You do not have permission to perform this operation.'));
      return;
    }
    next();
  };
}

function safeUser(row: RowDataPacket) {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    identifier: row.identifier,
    mobile: row.mobile,
    email: row.email || undefined,
    location: row.location,
    state: row.state,
    district: row.district,
    avatarUrl: row.avatar_data || undefined,
    verificationStatus: row.verification_status,
    landAcres: row.land_acres === null ? undefined : Number(row.land_acres),
    primaryCrops: row.primary_crops ? String(row.primary_crops).split(',') : [],
    gstin: row.gstin || undefined,
    tradeCategory: row.trade_category || undefined,
    cscKioskId: row.csc_kiosk_id || undefined,
    govCadre: row.gov_cadre || undefined,
    bankAccountLinked: Boolean(row.bank_account_linked),
    assignedCentreId: row.assigned_centre_id || undefined,
  };
}

async function assertBookingAccess(req: Request, bookingId: string): Promise<void> {
  if (req.user!.role === 'admin') return;
  const [rows] = await getDatabase().execute<RowDataPacket[]>('SELECT farmer_id, centre_id FROM bookings WHERE id = ?', [bookingId]);
  const booking = rows[0];
  if (!booking) throw new ApiError(404, 'Booking not found.');
  if (req.user!.role === 'farmer' && booking.farmer_id !== req.user!.id) throw new ApiError(404, 'Booking not found.');
  if (['officer', 'assisted'].includes(req.user!.role) && booking.centre_id !== req.user!.assignedCentreId) {
    throw new ApiError(403, 'This booking is outside your assigned procurement centre.');
  }
}

async function assertCentreAccess(req: Request, centreId: string): Promise<void> {
  if (req.user!.role === 'admin') return;
  if (['officer', 'assisted'].includes(req.user!.role) && centreId !== req.user!.assignedCentreId) {
    throw new ApiError(403, 'This centre is outside your assigned procurement centre.');
  }
}

export const apiRouter = Router();

apiRouter.post('/maps/geocode', authenticate, allowRoles('farmer'), asyncRoute(async (req, res) => {
  const input = parse(geocodeSchema, req.body);
  const key = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!key) throw new ApiError(503, 'Map geocoding is not configured. Set GOOGLE_MAPS_SERVER_API_KEY on the server.');

  const params = new URLSearchParams({
    key,
    region: 'in',
    ...( 'address' in input ? { address: input.address } : { latlng: `${input.lat},${input.lng}` }),
  });
  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new ApiError(502, 'Google Geocoding could not complete the request.');
  const result = await response.json() as {
    status?: string;
    results?: Array<{
      formatted_address?: string;
      geometry?: { location?: { lat?: number; lng?: number } };
    }>;
  };
  if (result.status === 'ZERO_RESULTS' || !result.results?.[0]?.geometry?.location) {
    throw new ApiError(404, 'Google Maps could not find coordinates for that location.');
  }
  if (result.status !== 'OK') {
    throw new ApiError(502, 'Google Geocoding returned an error. Check API enablement, key restrictions, and billing.');
  }

  const firstResult = result.results[0];
  res.json({
    lat: firstResult.geometry!.location!.lat,
    lng: firstResult.geometry!.location!.lng,
    formattedAddress: firstResult.formatted_address || '',
  });
}));

apiRouter.post('/maps/routes', authenticate, allowRoles('farmer'), asyncRoute(async (req, res) => {
  const input = parse(routesSchema, req.body);
  const key = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!key) throw new ApiError(503, 'Road routing is not configured. Set GOOGLE_MAPS_SERVER_API_KEY on the server.');

  const response = await fetch('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'originIndex,destinationIndex,distanceMeters,duration,condition,status',
    },
    body: JSON.stringify({
      origins: [{
        waypoint: { location: { latLng: { latitude: input.origin.lat, longitude: input.origin.lng } } },
      }],
      destinations: input.destinations.map(destination => ({
        waypoint: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
      })),
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      regionCode: 'IN',
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new ApiError(502, 'Google Routes could not calculate road distances. Check Routes API enablement, key restrictions, and billing.');

  const body = await response.text();
  let elements: Array<{
    destinationIndex?: number;
    distanceMeters?: number;
    duration?: string;
    condition?: string;
    status?: { code?: number };
  }>;
  try {
    const trimmedBody = body.trim();
    elements = trimmedBody.startsWith('[')
      ? JSON.parse(trimmedBody)
      : trimmedBody.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  } catch {
    throw new ApiError(502, 'Google Routes returned an unreadable response.');
  }

  res.json(elements.flatMap(element => {
    const destination = element.destinationIndex === undefined
      ? undefined
      : input.destinations[element.destinationIndex];
    const durationSeconds = element.duration ? Number.parseFloat(element.duration) : NaN;
    if (
      !destination ||
      element.status?.code ||
      element.condition !== 'ROUTE_EXISTS' ||
      !Number.isFinite(element.distanceMeters) ||
      !Number.isFinite(durationSeconds)
    ) return [];
    return [{
      centreId: destination.centreId,
      distanceMeters: element.distanceMeters,
      durationSeconds,
    }];
  }));
}));

apiRouter.post('/auth/register', asyncRoute(async (req, res) => {
  const input = parse(registrationSchema, req.body);
  const db = getDatabase();
  const id = randomUUID();
  const identifier = input.identifier || `FARM-${randomUUID().slice(0, 8).toUpperCase()}`;
  const claims = { id, role: 'farmer' as Role, identifier };
  const token = signToken(claims);
  const passwordHash = await bcrypt.hash(input.password, 12);
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `INSERT INTO users
       (id, name, role, identifier, mobile, email, password_hash, location, state, district, land_acres, bank_account_number, ifsc_code)
       VALUES (?, ?, 'farmer', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.name, identifier, input.mobile, input.email || null, passwordHash, input.location, input.state, input.district, input.landAcres ?? null, input.accountNumber || null, input.ifscCode || null],
    );
    for (const crop of input.primaryCrops || []) {
      await connection.execute('INSERT INTO farmer_crops (id, farmer_id, crop_name) VALUES (?, ?, ?)', [randomUUID(), id, crop]);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    if ((error as { code?: string }).code === 'ER_DUP_ENTRY') throw new ApiError(409, 'A user with that mobile number, email, or ID already exists.');
    throw error;
  } finally {
    connection.release();
  }
  res.status(201).json({ user: { ...claims, name: input.name, mobile: input.mobile, email: input.email, location: input.location, state: input.state, district: input.district, verificationStatus: 'pending', landAcres: input.landAcres, primaryCrops: input.primaryCrops || [] }, token });
}));

apiRouter.post('/auth/login', asyncRoute(async (req, res) => {
  const input = parse(loginSchema, req.body);
  const [rows] = await getDatabase().execute<RowDataPacket[]>(
    `SELECT u.*, (u.bank_account_number IS NOT NULL AND u.bank_account_number <> '') AS bank_account_linked,
      (SELECT GROUP_CONCAT(fc.crop_name ORDER BY fc.crop_name SEPARATOR ',') FROM farmer_crops fc WHERE fc.farmer_id = u.id) AS primary_crops
     FROM users u WHERE LOWER(u.identifier) = LOWER(?) OR u.mobile = ? OR LOWER(u.email) = LOWER(?) LIMIT 1`,
    [input.identifier, input.identifier, input.identifier],
  );
  const userRow = rows[0];
  if (!userRow || !(await bcrypt.compare(input.password, userRow.password_hash))) throw new ApiError(401, 'The username or password is incorrect.');
  const user = { id: userRow.id as string, role: userRow.role as Role, identifier: userRow.identifier as string, assignedCentreId: userRow.assigned_centre_id || undefined };
  res.json({ user: safeUser(userRow), token: signToken(user) });
}));

apiRouter.get('/profile', authenticate, asyncRoute(async (req, res) => {
  const [rows] = await getDatabase().execute<RowDataPacket[]>(
    `SELECT u.*, (u.bank_account_number IS NOT NULL AND u.bank_account_number <> '') AS bank_account_linked,
      (SELECT GROUP_CONCAT(fc.crop_name ORDER BY fc.crop_name SEPARATOR ',') FROM farmer_crops fc WHERE fc.farmer_id = u.id) AS primary_crops
     FROM users u WHERE u.id = ? LIMIT 1`,
    [req.user!.id],
  );
  if (!rows[0]) throw new ApiError(404, 'Profile not found.');
  res.json(safeUser(rows[0]));
}));

apiRouter.patch('/profile', authenticate, asyncRoute(async (req, res) => {
  const input = parse(profileUpdateSchema, req.body);
  const allowedFields: Partial<Record<keyof typeof input, Role[]>> = {
    landAcres: ['farmer'],
    primaryCrops: ['farmer'],
    gstin: ['buyer'],
    tradeCategory: ['buyer'],
    cscKioskId: ['assisted'],
    govCadre: ['officer', 'admin'],
  };
  for (const field of Object.keys(allowedFields) as Array<keyof typeof input>) {
    if (input[field] !== undefined && !allowedFields[field]?.includes(req.user!.role)) {
      throw new ApiError(403, `The ${field} field cannot be changed for this account role.`);
    }
  }

  const connection = await getDatabase().getConnection();
  try {
    await connection.beginTransaction();
    const [userRows] = await connection.execute<RowDataPacket[]>(
      'SELECT id, role FROM users WHERE id = ? FOR UPDATE',
      [req.user!.id],
    );
    const userRow = userRows[0];
    if (!userRow) throw new ApiError(404, 'Profile not found.');

    const assignments: string[] = [];
    const values: Array<string | number | null> = [];
    const columns: Array<{ column: string; value: string | number | null | undefined }> = [
      { column: 'name', value: input.name },
      { column: 'mobile', value: input.mobile },
      { column: 'email', value: input.email === '' ? null : input.email },
      { column: 'location', value: input.location },
      { column: 'state', value: input.state },
      { column: 'district', value: input.district },
      { column: 'land_acres', value: input.landAcres },
      { column: 'avatar_data', value: input.avatarData },
      { column: 'gstin', value: input.gstin },
      { column: 'trade_category', value: input.tradeCategory },
      { column: 'csc_kiosk_id', value: input.cscKioskId },
      { column: 'gov_cadre', value: input.govCadre },
    ];
    for (const { column, value } of columns) {
      if (value === undefined) continue;
      assignments.push(`${column} = ?`);
      values.push(value);
    }
    if (assignments.length) {
      values.push(req.user!.id);
      await connection.execute(
        `UPDATE users SET ${assignments.join(', ')} WHERE id = ?`,
        values,
      );
    }

    if (input.primaryCrops !== undefined) {
      await connection.execute('DELETE FROM farmer_crops WHERE farmer_id = ?', [req.user!.id]);
      for (const crop of input.primaryCrops) {
        await connection.execute(
          'INSERT INTO farmer_crops (id, farmer_id, crop_name) VALUES (?, ?, ?)',
          [randomUUID(), req.user!.id, crop],
        );
      }
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    if ((error as { code?: string }).code === 'ER_DUP_ENTRY') {
      throw new ApiError(409, 'That mobile number or email is already used by another account.');
    }
    throw error;
  } finally {
    connection.release();
  }

  const [rows] = await getDatabase().execute<RowDataPacket[]>(
    `SELECT u.*, (u.bank_account_number IS NOT NULL AND u.bank_account_number <> '') AS bank_account_linked,
      (SELECT GROUP_CONCAT(fc.crop_name ORDER BY fc.crop_name SEPARATOR ',') FROM farmer_crops fc WHERE fc.farmer_id = u.id) AS primary_crops
     FROM users u WHERE u.id = ? LIMIT 1`,
    [req.user!.id],
  );
  if (!rows[0]) throw new ApiError(404, 'Profile not found.');
  res.json(safeUser(rows[0]));
}));

apiRouter.get('/centres', asyncRoute(async (_req, res) => {
  const [rows] = await getDatabase().query<RowDataPacket[]>(
    `SELECT c.*,
      (SELECT COUNT(*) FROM bookings b WHERE b.centre_id = c.id AND b.booking_date = CURRENT_DATE()
       AND b.status NOT IN ('rejected', 'completed', 'paid')) AS current_queue_count,
      (SELECT COALESCE(SUM(b.quantity_quintals), 0) FROM bookings b WHERE b.centre_id = c.id
       AND b.booking_date = CURRENT_DATE() AND b.status NOT IN ('rejected', 'completed', 'paid')) AS current_booked_quintals,
      (SELECT GROUP_CONCAT(cc.crop_name ORDER BY cc.crop_name SEPARATOR ',') FROM centre_crops cc WHERE cc.centre_id = c.id) AS supported_crops
     FROM procurement_centres c WHERE c.is_active = 1 ORDER BY c.name`,
  );
  res.json(rows.map(row => ({
    id: row.id, name: row.name, code: row.code, state: row.state, district: row.district,
    taluk: row.taluk || '', pincode: row.pincode || '', distanceKm: 0,
    dailyCapacityQuintals: Number(row.daily_capacity_quintals),
    currentBookedQuintals: Number(row.current_booked_quintals || 0),
    operatingStatus: row.operating_status, contactPerson: row.contact_person || '',
    phone: row.phone || '', supportedCrops: row.supported_crops ? String(row.supported_crops).split(',') : [],
    currentQueueCount: Number(row.current_queue_count || 0), averageWaitTimeMinutes: Number(row.average_wait_minutes || 0),
    availableSlotsToday: Math.max(0, Number(row.daily_slot_capacity) - Number(row.current_queue_count || 0)),
    lat: row.latitude === null ? null : Number(row.latitude),
    lng: row.longitude === null ? null : Number(row.longitude),
  })));
}));

apiRouter.get('/farmers/search', authenticate, allowRoles('officer', 'admin', 'assisted'), asyncRoute(async (req, res) => {
  const query = z.string().trim().min(1).max(255).parse(req.query.query);
  const [rows] = await getDatabase().execute<RowDataPacket[]>(
    `SELECT u.*, (u.bank_account_number IS NOT NULL AND u.bank_account_number <> '') AS bank_account_linked,
      (SELECT GROUP_CONCAT(fc.crop_name ORDER BY fc.crop_name SEPARATOR ',') FROM farmer_crops fc WHERE fc.farmer_id = u.id) AS primary_crops
     FROM users u WHERE u.role = 'farmer' AND (u.mobile = ? OR LOWER(u.identifier) = LOWER(?)) LIMIT 1`,
    [query, query],
  );
  if (!rows[0]) throw new ApiError(404, 'No registered farmer was found for that mobile number or Farmer ID.');
  res.json(safeUser(rows[0]));
}));

apiRouter.post('/crops', authenticate, allowRoles('farmer'), asyncRoute(async (req, res) => {
  const input = parse(cropSchema, req.body);
  const id = randomUUID();
  await getDatabase().execute(
    `INSERT INTO farmer_crops (id, farmer_id, crop_name, variety, season, acreage, estimated_quantity_quintals, harvest_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, req.user!.id, input.cropName, input.variety || null, input.season || null, input.acreage ?? null, input.estimatedQuantityQuintals ?? null, input.harvestDate || null],
  );
  res.status(201).json({ id, farmerId: req.user!.id, ...input });
}));

apiRouter.get('/crops', authenticate, asyncRoute(async (req, res) => {
  const farmerId = req.user!.role === 'farmer' ? req.user!.id : String(req.query.farmerId || '');
  if (!farmerId && req.user!.role !== 'admin' && req.user!.role !== 'officer' && req.user!.role !== 'assisted') throw new ApiError(403, 'A farmer account is required.');
  const [rows] = await getDatabase().execute<RowDataPacket[]>(
    'SELECT id, farmer_id, crop_name, variety, season, acreage, estimated_quantity_quintals, harvest_date, created_at FROM farmer_crops WHERE farmer_id = ? ORDER BY created_at DESC',
    [farmerId],
  );
  res.json(rows);
}));

apiRouter.post('/bookings', authenticate, allowRoles('farmer', 'assisted', 'officer'), asyncRoute(async (req, res) => {
  const input = parse(bookingSchema, req.body);
  const db = getDatabase();
  const connection = await db.getConnection();
  const bookingId = randomUUID();
  const token = `AG-${randomUUID().slice(0, 8).toUpperCase()}`;
  let farmerId = req.user!.id;
  if (req.user!.role !== 'farmer') {
    const suppliedId = z.string().uuid().optional().parse(req.body.farmerId);
    if (suppliedId) {
      farmerId = suppliedId;
    } else {
      const farmerMobile = z.string().trim().min(8).max(32).parse(req.body.farmerMobile);
      const [farmers] = await getDatabase().execute<RowDataPacket[]>(
        "SELECT id FROM users WHERE role = 'farmer' AND mobile = ? LIMIT 1",
        [farmerMobile],
      );
      if (!farmers[0]) throw new ApiError(404, 'Register the farmer before creating a procurement booking.');
      farmerId = farmers[0].id;
    }
  }
  await assertCentreAccess(req, input.centreId);
  try {
    await connection.beginTransaction();
    const [centreRows] = await connection.execute<RowDataPacket[]>('SELECT id, name, code, daily_slot_capacity FROM procurement_centres WHERE id = ? AND is_active = 1 FOR UPDATE', [input.centreId]);
    const centre = centreRows[0];
    if (!centre) throw new ApiError(404, 'The selected procurement centre is unavailable.');
    const [dateRows] = await connection.execute<RowDataPacket[]>('SELECT ? >= CURRENT_DATE() AS date_available', [input.bookingDate]);
    if (!Number(dateRows[0].date_available)) throw new ApiError(400, 'Choose today or a future procurement date.');
    const [countRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS daily_count,
       COALESCE(SUM(slot_time = ?), 0) AS slot_count
       FROM bookings WHERE centre_id = ? AND booking_date = ?
       AND status NOT IN ('rejected', 'completed', 'paid')`,
      [input.slotTime, input.centreId, input.bookingDate],
    );
    const queuePosition = Number(countRows[0].slot_count) + 1;
    if (Number(countRows[0].daily_count) >= Number(centre.daily_slot_capacity)) {
      throw new ApiError(409, 'The selected procurement centre has no remaining slots that day.');
    }
    await connection.execute(
      `INSERT INTO bookings
       (id, token_number, farmer_id, crop_name, quantity_quintals, centre_id, booking_date, slot_time, status, queue_position, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'booking_confirmed', ?, ?)`,
      [bookingId, token, farmerId, input.crop, input.quantityQuintals, input.centreId, input.bookingDate, input.slotTime, queuePosition, input.notes || null],
    );
    if (input.cropDetails) {
      await connection.execute(
        `INSERT INTO farmer_crops (id, farmer_id, crop_name, variety, season, acreage, estimated_quantity_quintals, harvest_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [randomUUID(), farmerId, input.crop, input.cropDetails.variety || null, input.cropDetails.season || null, input.cropDetails.acreage ?? null, input.quantityQuintals, input.cropDetails.harvestDate || null],
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT b.*, u.name AS farmer_name, u.mobile AS farmer_mobile, c.name AS centre_name, c.code AS centre_code, u.identifier AS farmer_identifier
     FROM bookings b JOIN users u ON u.id = b.farmer_id JOIN procurement_centres c ON c.id = b.centre_id WHERE b.id = ?`,
    [bookingId],
  );
  res.status(201).json(bookingJson(rows[0]));
}));

function bookingJson(row: RowDataPacket) {
  return {
    id: row.id, tokenNumber: row.token_number, farmerId: row.farmer_id,
    farmerName: row.farmer_name, farmerMobile: row.farmer_mobile, crop: row.crop_name,
    quantityQuintals: Number(row.quantity_quintals), centreId: row.centre_id, centreName: row.centre_name,
    bookingDate: row.booking_date instanceof Date ? row.booking_date.toISOString().slice(0, 10) : row.booking_date,
    slotTime: row.slot_time, status: row.status, queuePosition: row.queue_position,
    estimatedWaitMinutes: Number(row.queue_position || 0) * 4, createdAt: row.created_at,
    qrPayload: `AGRIBRIDGE://PROCURE/TOKEN/${row.token_number}/FARMER/${row.farmer_identifier}/QTY/${row.quantity_quintals}/CENTRE/${row.centre_code}`,
    notes: row.notes || '',
    weighingSlip: row.weighing_slip_id ? {
      slipNumber: row.slip_number, grossWeightKg: Number(row.gross_weight_kg), tareWeightKg: Number(row.tare_weight_kg),
      netWeightKg: Number(row.net_weight_kg), netWeightQuintals: Number(row.net_weight_quintals),
      deductionPercentage: Number(row.deduction_percentage), finalProcuredQuintals: Number(row.final_procured_quintals),
      weighbridgeOperator: row.weighbridge_operator || '', weighedAt: row.weighed_at, vehicleNumber: row.vehicle_number || '',
    } : undefined,
    qualityMetrics: row.quality_id ? {
      moisturePercentage: Number(row.moisture_percentage), foreignMatterPercentage: Number(row.foreign_matter_percentage),
      damagedGrainsPercentage: Number(row.damaged_grains_percentage), grade: row.grade,
      testedByOfficerId: row.tested_by || '', testedAt: row.tested_at, remarks: row.quality_remarks || '',
    } : undefined,
    paymentDetails: row.transaction_id ? {
      transactionId: row.transaction_id, amount: Number(row.amount), mspRatePerQuintal: Number(row.rate_per_quintal),
      paymentDate: row.payment_date, method: row.payment_method, bankName: row.bank_name || '',
      accountEnding: row.account_ending || '', status: row.payment_status, referenceNo: row.reference_no || '',
    } : undefined,
    rejectionReason: row.rejection_reason || undefined,
  };
}

const bookingSelect = `SELECT b.*, u.name AS farmer_name, u.mobile AS farmer_mobile, u.identifier AS farmer_identifier,
  c.name AS centre_name, c.code AS centre_code, w.id AS weighing_slip_id, w.slip_number, w.gross_weight_kg, w.tare_weight_kg,
  w.net_weight_kg, w.net_weight_quintals, w.deduction_percentage, w.final_procured_quintals, w.weighbridge_operator, w.weighed_at, w.vehicle_number,
  q.id AS quality_id, q.moisture_percentage, q.foreign_matter_percentage, q.damaged_grains_percentage, q.grade, q.tested_by, q.tested_at, q.remarks AS quality_remarks,
  t.transaction_id, t.amount, t.rate_per_quintal, t.payment_date, t.payment_method, t.bank_name, t.account_ending, t.status AS payment_status, t.reference_no
  FROM bookings b JOIN users u ON u.id = b.farmer_id JOIN procurement_centres c ON c.id = b.centre_id
  LEFT JOIN weigh_slips w ON w.booking_id = b.id LEFT JOIN quality_assessments q ON q.booking_id = b.id
  LEFT JOIN transactions t ON t.booking_id = b.id`;

apiRouter.get('/bookings', authenticate, asyncRoute(async (req, res) => {
  if (req.user!.role === 'buyer') throw new ApiError(403, 'Buyer accounts do not have procurement booking access.');
  const params: string[] = [];
  let where = '';
  if (req.user!.role === 'farmer') { where = ' WHERE b.farmer_id = ?'; params.push(req.user!.id); }
  else if (['officer', 'assisted'].includes(req.user!.role)) {
    where = ' WHERE b.centre_id = ?';
    params.push(req.user!.assignedCentreId || '');
  }
  else if (req.query.farmerId) { where = ' WHERE b.farmer_id = ?'; params.push(String(req.query.farmerId)); }
  const [rows] = await getDatabase().execute<RowDataPacket[]>(`${bookingSelect}${where} ORDER BY b.created_at DESC LIMIT 500`, params);
  res.json(rows.map(bookingJson));
}));

apiRouter.get('/bookings/:bookingId/status', authenticate, asyncRoute(async (req, res) => {
  await assertBookingAccess(req, req.params.bookingId);
  const [rows] = await getDatabase().execute<RowDataPacket[]>(`${bookingSelect} WHERE b.id = ?`, [req.params.bookingId]);
  const booking = rows[0];
  if (!booking || (req.user!.role === 'farmer' && booking.farmer_id !== req.user!.id)) throw new ApiError(404, 'Booking not found.');
  res.json({ id: booking.id, status: booking.status, queuePosition: booking.queue_position, booking: bookingJson(booking) });
}));

apiRouter.get('/centres/:centreId/queue', authenticate, asyncRoute(async (req, res) => {
  await assertCentreAccess(req, req.params.centreId);
  const [rows] = await getDatabase().execute<RowDataPacket[]>(
    `SELECT b.id, b.token_number, b.crop_name, b.quantity_quintals, b.booking_date, b.slot_time,
      b.status, b.queue_position, u.name AS farmer_name
     FROM bookings b JOIN users u ON u.id = b.farmer_id
     WHERE b.centre_id = ? AND b.booking_date = CURRENT_DATE()
       AND b.status IN ('booking_confirmed', 'token_generated', 'waiting', 'called', 'weighing', 'quality_check')
     ORDER BY b.queue_position, b.created_at`,
    [req.params.centreId],
  );
  res.json(rows.map(row => ({
    id: row.id, tokenNumber: row.token_number, crop: row.crop_name,
    quantityQuintals: Number(row.quantity_quintals), bookingDate: row.booking_date,
    slotTime: row.slot_time, status: row.status, queuePosition: row.queue_position,
    farmerName: req.user!.role === 'farmer' ? undefined : row.farmer_name,
  })));
}));

apiRouter.post('/centres/:centreId/queue/advance', authenticate, allowRoles('officer', 'admin', 'assisted'), asyncRoute(async (req, res) => {
  await assertCentreAccess(req, req.params.centreId);
  const connection = await getDatabase().getConnection();
  let nextBookingId: string | null = null;
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM bookings WHERE centre_id = ? AND booking_date = CURRENT_DATE()
       AND status IN ('booking_confirmed', 'token_generated', 'waiting') ORDER BY queue_position, created_at LIMIT 1 FOR UPDATE`,
      [req.params.centreId],
    );
    if (rows.length) {
      nextBookingId = rows[0].id;
      await connection.execute('UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['called', nextBookingId]);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  res.json({ centreId: req.params.centreId, calledBookingId: nextBookingId });
}));

apiRouter.patch('/bookings/:bookingId/status', authenticate, allowRoles('officer', 'admin', 'assisted'), asyncRoute(async (req, res) => {
  const input = parse(statusSchema, req.body);
  await assertBookingAccess(req, req.params.bookingId);
  const connection = await getDatabase().getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<RowDataPacket[]>('SELECT status FROM bookings WHERE id = ? FOR UPDATE', [req.params.bookingId]);
    if (!rows.length) throw new ApiError(404, 'Booking not found.');
    const currentStatus = rows[0].status as string;
    const allowedPrevious: Record<typeof input.status, string[]> = {
      waiting: ['booking_confirmed', 'token_generated', 'waiting'],
      called: ['booking_confirmed', 'token_generated', 'waiting'],
      weighing: ['called', 'weighing'],
      rejected: ['booking_confirmed', 'token_generated', 'waiting', 'called', 'weighing', 'quality_check', 'approved', 'rejected'],
    };
    if (!allowedPrevious[input.status].includes(currentStatus)) throw new ApiError(409, `Cannot change booking from ${currentStatus} to ${input.status}.`);
    await connection.execute(
      'UPDATE bookings SET status = ?, rejection_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [input.status, input.status === 'rejected' ? input.rejectionReason || null : null, req.params.bookingId],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  res.json({ id: req.params.bookingId, status: input.status });
}));

apiRouter.post('/bookings/:bookingId/approve', authenticate, allowRoles('officer', 'admin', 'assisted'), asyncRoute(async (req, res) => {
  await assertBookingAccess(req, req.params.bookingId);
  const [result] = await getDatabase().execute<ResultSetHeader>(
    `UPDATE bookings b JOIN quality_assessments q ON q.booking_id = b.id
     SET b.status = 'approved', b.rejection_reason = NULL, b.updated_at = CURRENT_TIMESTAMP
     WHERE b.id = ? AND q.grade <> 'Sub-Standard' AND b.status IN ('quality_check', 'approved')`,
    [req.params.bookingId],
  );
  if (!result.affectedRows) throw new ApiError(409, 'A passing quality assessment is required before approval.');
  res.json({ id: req.params.bookingId, status: 'approved' });
}));

apiRouter.post('/bookings/:bookingId/quality', authenticate, allowRoles('officer', 'admin', 'assisted'), asyncRoute(async (req, res) => {
  const input = parse(qualitySchema, req.body);
  const bookingId = req.params.bookingId;
  await assertBookingAccess(req, bookingId);
  const db = getDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<RowDataPacket[]>('SELECT id FROM bookings WHERE id = ? FOR UPDATE', [bookingId]);
    if (!rows.length) throw new ApiError(404, 'Booking not found.');
    await connection.execute(
      `INSERT INTO quality_assessments
       (id, booking_id, moisture_percentage, foreign_matter_percentage, damaged_grains_percentage, grade, tested_by, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE moisture_percentage = VALUES(moisture_percentage), foreign_matter_percentage = VALUES(foreign_matter_percentage),
       damaged_grains_percentage = VALUES(damaged_grains_percentage), grade = VALUES(grade), tested_by = VALUES(tested_by), remarks = VALUES(remarks)`,
      [randomUUID(), bookingId, input.moisturePercentage, input.foreignMatterPercentage, input.damagedGrainsPercentage, input.grade, req.user!.id, input.remarks || null],
    );
    await connection.execute('UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [input.grade === 'Sub-Standard' ? 'rejected' : 'approved', bookingId]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  res.status(201).json({ bookingId, ...input, testedBy: req.user!.id });
}));

apiRouter.post('/bookings/:bookingId/weigh-slip', authenticate, allowRoles('officer', 'admin', 'assisted'), asyncRoute(async (req, res) => {
  const input = parse(weighSchema, req.body);
  await assertBookingAccess(req, req.params.bookingId);
  if (input.grossWeightKg <= input.tareWeightKg) throw new ApiError(400, 'Gross weight must exceed tare weight.');
  const netWeightKg = input.grossWeightKg - input.tareWeightKg;
  const netWeightQuintals = Number((netWeightKg / 100).toFixed(2));
  const finalProcuredQuintals = Number((netWeightQuintals * (1 - input.deductionPercentage / 100)).toFixed(2));
  const slipNumber = `WB-${randomUUID().slice(0, 10).toUpperCase()}`;
  const connection = await getDatabase().getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<RowDataPacket[]>('SELECT id FROM bookings WHERE id = ? FOR UPDATE', [req.params.bookingId]);
    if (!rows.length) throw new ApiError(404, 'Booking not found.');
    await connection.execute(
      `INSERT INTO weigh_slips (id, booking_id, slip_number, gross_weight_kg, tare_weight_kg, net_weight_kg, net_weight_quintals, deduction_percentage, final_procured_quintals, weighbridge_operator, vehicle_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE slip_number = VALUES(slip_number), gross_weight_kg = VALUES(gross_weight_kg), tare_weight_kg = VALUES(tare_weight_kg),
       net_weight_kg = VALUES(net_weight_kg), net_weight_quintals = VALUES(net_weight_quintals), deduction_percentage = VALUES(deduction_percentage),
       final_procured_quintals = VALUES(final_procured_quintals), weighbridge_operator = VALUES(weighbridge_operator), vehicle_number = VALUES(vehicle_number)`,
      [randomUUID(), req.params.bookingId, slipNumber, input.grossWeightKg, input.tareWeightKg, netWeightKg, netWeightQuintals, input.deductionPercentage, finalProcuredQuintals, req.user!.identifier, input.vehicleNumber || null],
    );
    await connection.execute('UPDATE bookings SET quantity_quintals = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [finalProcuredQuintals, 'quality_check', req.params.bookingId]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  res.status(201).json({ bookingId: req.params.bookingId, slipNumber, grossWeightKg: input.grossWeightKg, tareWeightKg: input.tareWeightKg, netWeightKg, netWeightQuintals, deductionPercentage: input.deductionPercentage, finalProcuredQuintals, weighbridgeOperator: req.user!.identifier, vehicleNumber: input.vehicleNumber || '', weighedAt: new Date().toISOString() });
}));

apiRouter.post('/bookings/:bookingId/payment', authenticate, allowRoles('officer', 'admin'), asyncRoute(async (req, res) => {
  const bookingId = req.params.bookingId;
  await assertBookingAccess(req, bookingId);
  const connection = await getDatabase().getConnection();
  let transactionId = '';
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT b.id, b.status, b.quantity_quintals, u.bank_account_number FROM bookings b JOIN users u ON u.id = b.farmer_id WHERE b.id = ? FOR UPDATE`,
      [bookingId],
    );
    const booking = rows[0];
    if (!booking) throw new ApiError(404, 'Booking not found.');
    if (!['approved', 'payment_processing'].includes(booking.status)) throw new ApiError(409, 'Only approved bookings can be paid.');
    if (!booking.bank_account_number) throw new ApiError(409, 'Farmer bank details are missing.');
    const [existingTransactions] = await connection.execute<RowDataPacket[]>('SELECT id FROM transactions WHERE booking_id = ? FOR UPDATE', [bookingId]);
    if (existingTransactions.length) throw new ApiError(409, 'A payment transaction already exists for this booking.');
    transactionId = `DBT-${randomUUID().slice(0, 12).toUpperCase()}`;
    const rate = z.number().positive().max(100000).default(2320).parse(req.body?.ratePerQuintal);
    const amount = Number((Number(booking.quantity_quintals) * rate).toFixed(2));
    await connection.execute(
      `INSERT INTO transactions (id, booking_id, transaction_id, amount, rate_per_quintal, payment_method, status, reference_no)
       VALUES (?, ?, ?, ?, ?, 'PFMS / DBT direct bank transfer', 'Processing', ?)
       ON DUPLICATE KEY UPDATE amount = VALUES(amount), rate_per_quintal = VALUES(rate_per_quintal), status = VALUES(status)`,
      [randomUUID(), bookingId, transactionId, amount, rate, transactionId],
    );
    await connection.execute('UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['payment_processing', bookingId]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  res.status(201).json({ bookingId, transactionId, status: 'Processing' });
}));

apiRouter.get('/transactions', authenticate, asyncRoute(async (req, res) => {
  if (req.user!.role === 'buyer') throw new ApiError(403, 'Buyer accounts do not have payment transaction access.');
  const where = req.user!.role === 'farmer' ? ' WHERE b.farmer_id = ?' : '';
  const params = req.user!.role === 'farmer' ? [req.user!.id] : [];
  let transactionWhere = where;
  if (['officer', 'assisted'].includes(req.user!.role)) {
    transactionWhere = ' WHERE b.centre_id = ?';
    params.push(req.user!.assignedCentreId || '');
  }
  const [rows] = await getDatabase().execute<RowDataPacket[]>(
    `SELECT t.*, b.token_number, b.crop_name, b.quantity_quintals, u.name AS farmer_name, c.name AS centre_name
     FROM transactions t JOIN bookings b ON b.id = t.booking_id JOIN users u ON u.id = b.farmer_id JOIN procurement_centres c ON c.id = b.centre_id
     ${transactionWhere} ORDER BY t.created_at DESC LIMIT 500`,
    params,
  );
  res.json(rows);
}));

apiRouter.patch('/admin/transactions/:transactionId/status', authenticate, allowRoles('admin'), asyncRoute(async (req, res) => {
  const input = z.object({ status: z.enum(['Pending', 'Processing', 'Credited to Farmer', 'Failed']) }).parse(req.body);
  const connection = await getDatabase().getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute<ResultSetHeader>(
      'UPDATE transactions SET status = ?, payment_date = CASE WHEN ? = ? THEN CURRENT_TIMESTAMP ELSE payment_date END, updated_at = CURRENT_TIMESTAMP WHERE transaction_id = ?',
      [input.status, input.status, 'Credited to Farmer', req.params.transactionId],
    );
    if (!result.affectedRows) throw new ApiError(404, 'Transaction not found.');
    if (input.status === 'Credited to Farmer') {
      await connection.execute(
        `UPDATE bookings b JOIN transactions t ON t.booking_id = b.id SET b.status = 'paid', b.updated_at = CURRENT_TIMESTAMP WHERE t.transaction_id = ?`,
        [req.params.transactionId],
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  res.json({ transactionId: req.params.transactionId, status: input.status });
}));

apiRouter.post('/admin/users', authenticate, allowRoles('admin'), asyncRoute(async (req, res) => {
  const input = registrationSchema.extend({ role: z.enum(['officer', 'buyer', 'admin', 'assisted']), assignedCentreId: z.string().uuid().optional() }).parse(req.body);
  const id = randomUUID();
  const identifier = input.identifier || `${input.role.toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const passwordHash = await bcrypt.hash(input.password, 12);
  await getDatabase().execute(
    `INSERT INTO users (id, name, role, identifier, mobile, email, password_hash, location, state, district, assigned_centre_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.name, input.role, identifier, input.mobile, input.email || null, passwordHash, input.location, input.state, input.district, input.assignedCentreId || null],
  );
  res.status(201).json({ id, name: input.name, role: input.role, identifier, mobile: input.mobile });
}));

apiRouter.post('/admin/centres', authenticate, allowRoles('admin'), asyncRoute(async (req, res) => {
  const input = z.object({
    name: requiredText, code: requiredText, state: requiredText, district: requiredText,
    taluk: z.string().max(100).optional(), pincode: z.string().max(12).optional(),
    dailyCapacityQuintals: z.number().positive(), dailySlotCapacity: z.number().int().positive(),
    operatingStatus: z.enum(['Operational', 'High Traffic', 'Maintenance', 'Closed']).default('Operational'),
    contactPerson: z.string().max(255).optional(), phone: z.string().max(32).optional(),
    latitude: z.number().min(-90).max(90).optional(), longitude: z.number().min(-180).max(180).optional(),
    supportedCrops: z.array(z.string().min(1).max(100)).default([]),
  }).refine(input => (input.latitude === undefined) === (input.longitude === undefined), {
    message: 'latitude and longitude must be provided together.',
    path: ['longitude'],
  }).parse(req.body);
  const id = randomUUID();
  const connection = await getDatabase().getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `INSERT INTO procurement_centres (id, name, code, state, district, taluk, pincode, daily_capacity_quintals, daily_slot_capacity, operating_status, contact_person, phone, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.name, input.code, input.state, input.district, input.taluk || null, input.pincode || null, input.dailyCapacityQuintals, input.dailySlotCapacity, input.operatingStatus, input.contactPerson || null, input.phone || null, input.latitude ?? null, input.longitude ?? null],
    );
    for (const crop of input.supportedCrops) await connection.execute('INSERT INTO centre_crops (centre_id, crop_name) VALUES (?, ?)', [id, crop]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    if ((error as { code?: string }).code === 'ER_DUP_ENTRY') throw new ApiError(409, 'A procurement centre with that code already exists.');
    throw error;
  } finally {
    connection.release();
  }
  res.status(201).json({ id, ...input });
}));

export function apiErrorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if ((error as Error)?.message === 'Origin is not allowed by CORS.') {
    res.status(403).json({ error: 'This origin is not allowed to access the API.' });
    return;
  }
  if (error instanceof ApiError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  if (error instanceof z.ZodError) {
    res.status(400).json({ error: error.issues.map(issue => `${issue.path.join('.') || 'request'}: ${issue.message}`).join('; ') });
    return;
  }
  if ((error as { code?: string })?.code === 'ER_DUP_ENTRY') {
    res.status(409).json({ error: 'A record with the supplied unique value already exists.' });
    return;
  }
  if ((error as Error)?.message?.startsWith('Database is not configured')) {
    res.status(503).json({ error: (error as Error).message });
    return;
  }
  const status = (error as { status?: number })?.status;
  if (status === 400 || status === 413 || status === 415) {
    res.status(status).json({ error: status === 413 ? 'Request body is too large.' : 'Request body is invalid.' });
    return;
  }
  console.error('API request failed:', error);
  res.status(500).json({ error: 'An unexpected server error occurred.' });
}
