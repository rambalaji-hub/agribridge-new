export type UserRole = 'farmer' | 'officer' | 'buyer' | 'admin' | 'assisted';

export type LanguageCode = 'en' | 'ta' | 'hi' | 'te' | 'kn' | 'ml' | 'mr';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  identifier: string; // Farmer ID, Officer ID, Buyer ID, Staff ID, Admin ID
  mobile: string;
  email?: string;
  location: string;
  state: string;
  district: string;
  avatarUrl?: string;
  verificationStatus: 'verified' | 'pending' | 'requires_review';
  aadhaarLinked?: boolean;
  bankAccountLinked?: boolean;
  assignedCentreId?: string; // For officer/staff
  landAcres?: number;
  primaryCrops?: string[];
  gstin?: string;
  tradeCategory?: string;
  cscKioskId?: string;
  govCadre?: string;
  accountNumber?: string;
  ifscCode?: string;
}

export type ProfileUpdate = Partial<Omit<UserProfile, 'avatarUrl'>> & {
  avatarUrl?: string | null;
};

export type CropType = 
  | 'Paddy (Dhan)' 
  | 'Wheat (Gehun)' 
  | 'Maize (Makka)' 
  | 'Groundnut (Mungfali)' 
  | 'Soybean' 
  | 'Cotton (Kapas)' 
  | 'Gram (Chana)' 
  | 'Mustard' 
  | 'Tomato' 
  | 'Onion' 
  | 'Potato' 
  | 'Sugarcane' 
  | 'Mango';

export interface CropInfo {
  id: string;
  name: CropType;
  category: 'Kharif' | 'Rabi' | 'Zaid' | 'Commercial' | 'Horticulture';
  mspPrice: number; // in ₹ per Quintal
  marketPrice: number; // average market price ₹/Qtl
  unit: string;
  imageUrl: string;
  maxMoistureAllowed: number; // percentage
  foreignMatterAllowed: number; // percentage
}

export interface ProcurementCentre {
  id: string;
  name: string;
  code: string;
  state: string;
  district: string;
  taluk: string;
  pincode: string;
  distanceKm: number; // relative to sample user location
  dailyCapacityQuintals: number;
  currentBookedQuintals: number;
  operatingStatus: 'Operational' | 'High Traffic' | 'Maintenance' | 'Closed';
  contactPerson: string;
  phone: string;
  supportedCrops: CropType[];
  currentQueueCount: number;
  averageWaitTimeMinutes: number;
  availableSlotsToday: number;
  lat: number | null;
  lng: number | null;
}

export type ProcurementStage = 
  | 'booking_confirmed'
  | 'token_generated'
  | 'waiting'
  | 'called'
  | 'weighing'
  | 'quality_check'
  | 'approved'
  | 'rejected'
  | 'payment_processing'
  | 'paid'
  | 'completed';

export interface QualityMetrics {
  moisturePercentage: number;
  foreignMatterPercentage: number;
  damagedGrainsPercentage: number;
  grade: 'FAQ (Fair Average Quality)' | 'Grade A' | 'Sub-Standard';
  testedByOfficerId: string;
  testedAt: string;
  remarks?: string;
}

export interface WeighingSlip {
  slipNumber: string;
  grossWeightKg: number;
  tareWeightKg: number;
  netWeightKg: number;
  netWeightQuintals: number;
  deductionPercentage: number;
  finalProcuredQuintals: number;
  weighbridgeOperator: string;
  weighedAt: string;
  vehicleNumber: string;
}

export interface PaymentDetails {
  transactionId: string;
  amount: number;
  mspRatePerQuintal: number;
  paymentDate: string;
  method: 'PFMS / DBT direct bank transfer' | 'e-Kuber RBI' | 'Escrow UPI';
  bankName: string;
  accountEnding: string;
  status: 'Pending' | 'Processing' | 'Credited to Farmer' | 'Failed';
  referenceNo: string;
}

export interface ProcurementBooking {
  id: string;
  tokenNumber: string; // e.g. #AG240024
  farmerId: string;
  farmerName: string;
  farmerMobile: string;
  crop: CropType;
  quantityQuintals: number;
  centreId: string;
  centreName: string;
  bookingDate: string;
  slotTime: string; // e.g. "09:30 AM - 11:00 AM"
  status: ProcurementStage;
  queuePosition?: number;
  estimatedWaitMinutes?: number;
  createdAt: string;
  weighingSlip?: WeighingSlip;
  qualityMetrics?: QualityMetrics;
  paymentDetails?: PaymentDetails;
  qrPayload: string;
  rejectionReason?: string;
  notes?: string;
}

export interface MarketplaceListing {
  id: string;
  crop: CropType;
  farmerId: string;
  farmerName: string;
  farmerPhone: string;
  location: string;
  quantityQuintals: number;
  pricePerQuintal: number;
  harvestDate: string;
  description: string;
  imageUrl: string;
  verificationBadge: boolean;
  listingDate: string;
  status: 'Available' | 'Offer Received' | 'Sold' | 'Reserved';
  category: 'Surplus Produce' | 'Direct Farm Fresh' | 'Organic Certified';
}

export interface OrderTransactionDetails {
  transactionId: string;
  utrNumber: string;
  paymentMethod: string;
  paymentGateway: string;
  paidAt: string;
  baseAmount: number;
  mandiCess: number;
  escrowFee: number;
  transportCost: number;
  totalTransacted: number;
  escrowStatus: 'Escrow Secured' | 'Released to Farmer' | 'Refunded';
  farmerBeneficiary: {
    name: string;
    bankName: string;
    accountMasked: string;
    ifsc: string;
  };
}

export interface MarketplaceOrder {
  id: string;
  listingId: string;
  crop: CropType;
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  farmerId: string;
  farmerName: string;
  quantityQuintals: number;
  agreedPricePerQuintal: number;
  totalAmount: number;
  orderDate: string;
  pickupLocation: string;
  deliveryLocation: string;
  transportStatus: 'Order Confirmed' | 'Pickup Scheduled' | 'Picked Up' | 'In Transit' | 'Delivered' | 'Completed';
  estimatedTransportCost: number;
  pickupDate: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  paymentStatus: 'Escrow Held' | 'Released to Farmer' | 'Refunded';
  paymentMethod?: string;
  transactionDetails?: OrderTransactionDetails;
}

export interface ComplaintTicket {
  id: string;
  ticketNo: string;
  farmerId: string;
  farmerName: string;
  category: 'Weight Discrepancy' | 'Quality Grading Dispute' | 'Payment Delay (DBT)' | 'Staff Misbehaviour' | 'Slot Rescheduling' | 'Centre Infrastructure';
  description: string;
  relatedBookingId?: string;
  status: 'Submitted' | 'Under Review' | 'Action Taken' | 'Resolved';
  dateSubmitted: string;
  resolutionNote?: string;
  officerAssigned?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  category: 'slot' | 'token' | 'queue' | 'quality' | 'payment' | 'marketplace' | 'alert';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  deliveryChannels: {
    sms: boolean;
    whatsapp: boolean;
    voice: boolean;
  };
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  relatedRecordType: 'Booking' | 'QualityCheck' | 'Weighment' | 'Payment' | 'Listing' | 'User' | 'System';
  relatedRecordId: string;
  previousValue?: string;
  newValue?: string;
  ipAddress: string;
}

export interface DrawerDetailState {
  isOpen: boolean;
  type: 'booking' | 'payment' | 'crop' | 'token' | 'queue' | 'complaint' | 'centre' | 'order' | null;
  data: any;
}

export interface PrintDocumentState {
  isOpen: boolean;
  docType: 'token' | 'weigh-slip';
  data: any;
  autoTriggerPrint?: boolean;
}
