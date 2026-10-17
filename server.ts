import express, { Request, Response } from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { apiRouter, apiErrorHandler } from './server/api';
import { checkDatabase } from './server/database';
import { LanguageCode } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: [
    path.resolve(__dirname, '.env.local'),
    path.resolve(__dirname, '.env'),
  ],
});

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin is not allowed by CORS.'));
  },
}));
app.use(express.json({ limit: '5mb' }));

// Initialize Google GenAI Client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface ChatHistoryItem {
  role: 'user' | 'model';
  text: string;
}

const LANG_NAMES: Record<LanguageCode, string> = {
  en: 'English',
  ta: 'Tamil (தமிழ்)',
  hi: 'Hindi (हिन्दी)',
  te: 'Telugu (తెలుగు)',
  kn: 'Kannada (ಕನ್ನಡ)',
  ml: 'Malayalam (മലയാളം)',
  mr: 'Marathi (मराठी)'
};

function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === 'string' && Object.hasOwn(LANG_NAMES, value);
}

const SPEECH_RECOGNITION_LANGUAGES: Record<string, string> = {
  en: 'English',
  ta: 'Tamil',
  hi: 'Hindi',
  ml: 'Malayalam',
  mr: 'Marathi',
  te: 'Telugu',
  kn: 'Kannada',
};

// Fallback intelligent query answering if Gemini API quota or key is unavailable
function generateContextualFallbackAnswer(message: string, context: any, lang: string = 'en'): string {
  const query = message.toLowerCase();

  // MSP Rates inquiry
  if (query.includes('msp') || query.includes('rate') || query.includes('price') || query.includes('விலை') || query.includes('விலைகள்') || query.includes('एमएसपी') || query.includes('दाम') || query.includes('ధర') || query.includes('ಬೆಲೆ') || query.includes('നിരക്ക്') || query.includes('भाव')) {
    if (lang === 'ta') {
      return `🌾 **அரசு குறைந்தபட்ச ஆதரவு விலைகள் (MSP 2024-2026):**\n\n- **நெல் (Paddy Grade A)**: ₹2,320 / குவிண்டால் (அனுமதிக்கப்பட்ட ஈரப்பதம்: 17% வரை)\n- **நெல் (Paddy Common)**: ₹2,300 / குவிண்டால்\n- **கோதுமை (Wheat)**: ₹2,275 / குவிண்டால்\n- **மக்காச்சோளம் (Maize)**: ₹2,225 / குவிண்டால்\n- **நிலக்கடலை (Groundnut)**: ₹6,783 / குவிண்டால்\n- **சோயாபீன் (Soybean)**: ₹4,892 / குவிண்டால்\n- **பருத்தி (Cotton)**: ₹7,121 / குவிண்டால்\n- **கொண்டைக்கடலை (Gram)**: ₹5,440 / குவிண்டால்\n\nஅரசு அங்கீகரிக்கப்பட்ட APMC மண்டிகளில் இந்த விலையில் நேரடி DBT மூலம் பணம் விவசாயிகளின் வங்கிக் கணக்கில் 48-72 மணி நேரத்திற்குள் வரவு வைக்கப்படுகிறது.`;
    }
    if (lang === 'hi') {
      return `🌾 **सरकारी न्यूनतम समर्थन मूल्य (MSP 2024-2026 गजट):**\n\n- **धान ग्रेड-ए (Paddy Grade A)**: ₹2,320 / क्विंटल (स्वीकार्य नमी: 17% तक)\n- **धान सामान्य (Paddy Common)**: ₹2,300 / क्विंटल\n- **गेहूं (Wheat)**: ₹2,275 / क्विंटल\n- **मक्का (Maize)**: ₹2,225 / क्विंटल\n- **मूंगफली (Groundnut)**: ₹6,783 / क्विंटल\n- **सोयाबीन (Soybean)**: ₹4,892 / क्विंटल\n- **कपास (Cotton)**: ₹7,121 / क्विंटल\n- **चना (Gram)**: ₹5,440 / क्विंटल\n\nसभी खरीद का भुगतान आधार-लिंक्ड PFMS प्रत्यक्ष लाभ अंतरण (DBT) के जरिए 48 से 72 घंटों में सीधे बैंक खाते में जमा किया जाता है।`;
    }
    if (lang === 'te') {
      return `🌾 **ప్రభుత్వ కనీస మద్దతు ధరలు (MSP 2024-2026 గెజిట్):**\n\n- **వరి గ్రేడ్-ఎ**: ₹2,320 / క్వింటాల్ (గరిష్ట తేమ: 17.0%)\n- **వరి సాధారణం**: ₹2,300 / క్వింటాల్\n- **గోధుమలు**: ₹2,275 / క్వింటాల్\n- **మొక్కజొన్న**: ₹2,225 / క్వింటాల్\n- **వేరుశనగ**: ₹6,783 / క్వింటాల్\n- **సోయాబీన్**: ₹4,892 / క్వింటాల్\n- **పత్తి**: ₹7,121 / క్వింటాల్\n\nఅన్ని సేకరణల నిధులు ఆధార్ అనుసంధానిత PFMS DBT ద్వారా 48-72 గంటల్లో నేరుగా రైతు బ్యాంక్ ఖాతాలో జమ చేయబడతాయి.`;
    }
    if (lang === 'kn') {
      return `🌾 **ಸರ್ಕಾರದ ಅಧಿಕೃತ ಕನಿಷ್ಠ ಬೆಂಬಲ ಬೆಲೆ (MSP 2024-2026):**\n\n- **ಭತ್ತ ಗ್ರೇಡ್-ಎ**: ₹2,320 / ಕ್ವಿಂಟಾಲ್ (ಗರಿಷ್ಠ ತೇವಾಂಶ: 17.0%)\n- **ಭತ್ತ ಸಾಮಾನ್ಯ**: ₹2,300 / ಕ್ವಿಂಟಾಲ್\n- **ಗೋಧಿ**: ₹2,275 / ಕ್ವಿಂಟಾಲ್\n- **ಮೆಕ್ಕೆಜೋಳ**: ₹2,225 / ಕ್ವಿಂಟಾಲ್\n- **ಕಡಲೆಕಾಯಿ**: ₹6,783 / ಕ್ವಿಂಟಾಲ್\n- **ಹತ್ತಿ**: ₹7,121 / ಕ್ವಿಂಟಾಲ್\n\nಪರಿಶೀಲಿಸಿದ ಖರೀದಿ ಮೊತ್ತವನ್ನು ಆಧಾರ್ ಲಿಂಕ್ ಮಾಡಿದ ನೇರ ಲಾಭ ವರ್ಗಾವಣೆ (DBT) ಮೂಲಕ 48 ರಿಂದ 72 ಗಂಟೆಗಳಲ್ಲಿ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ಜಮೆ ಮಾಡಲಾಗುತ್ತದೆ.`;
    }
    if (lang === 'ml') {
      return `🌾 **ഔദ്യോഗിക സർക്കാർ താങ്ങുവില (MSP 2024-2026):**\n\n- **നെല്ല് ഗ്രേഡ്-എ**: ₹2,320 / ക്വിന്റൽ (ഈർപ്പം പരിധി: 17.0%)\n- **നെല്ല് സാധാരണ**: ₹2,300 / ക്വിന്റൽ\n- **ഗോതമ്പ്**: ₹2,275 / ക്വിന്റൽ\n- **ചോളം**: ₹2,225 / ക്വിന്റൽ\n- **നിലക്കടല**: ₹6,783 / ക്വിന്റൽ\n- **പരുത്തി**: ₹7,121 / ക്വിന്റൽ\n\nഎല്ലാ തുകയും ആധാർ ലിങ്ക് ചെയ്ത ബാങ്ക് അക്കൗണ്ടിലേക്ക് 48 മുതൽ 72 മണിക്കൂറിനുള്ളിൽ നേരിട്ട് എത്തും.`;
    }
    if (lang === 'mr') {
      return `🌾 **अधिकृत शासकीय हमीभाव (MSP 2024-2026):**\n\n- **भात ग्रेड-ए**: ₹2,320 / क्विंटल (कमाल ओलावा: 17.0%)\n- **भात सर्वसाधारण**: ₹2,300 / क्विंटल\n- **गहू**: ₹2,275 / क्विंटल\n- **मका**: ₹2,225 / क्विंटल\n- **भुईमूग**: ₹6,783 / क्विंटल\n- **सोयाबीन**: ₹4,892 / क्विंटल\n- **कापूस**: ₹7,121 / क्विंटल\n\nसर्व खरेदीची रक्कम आधार-संलग्न PFMS थेट लाभ हस्तांतरणाद्वारे 48 ते 72 तासांत थेट बँक खात्यात जमा होते.`;
    }
    return `🌾 **Official Government Minimum Support Price (MSP 2024-2026 Gazette):**\n\n- **Paddy (Grade A)**: ₹2,320 / Quintal (Max permissible moisture: 17.0%)\n- **Paddy (Common)**: ₹2,300 / Quintal\n- **Wheat (Gehun)**: ₹2,275 / Quintal (Max moisture: 12.0%)\n- **Maize (Makka)**: ₹2,225 / Quintal (Max moisture: 14.0%)\n- **Groundnut (Mungfali)**: ₹6,783 / Quintal (Max moisture: 8.0%)\n- **Soybean**: ₹4,892 / Quintal (Max moisture: 12.0%)\n- **Cotton (Kapas)**: ₹7,121 / Quintal\n- **Gram (Chana)**: ₹5,440 / Quintal\n\nAll verified procurement consignments receive direct bank transfer (DBT) via Aadhaar-linked PFMS within 48 to 72 hours of quality approval.`;
  }

  // Queue / Token / Position
  if (query.includes('queue') || query.includes('token') || query.includes('position') || query.includes('வரிசை') || query.includes('டோக்கன்') || query.includes('कतार') || query.includes('टोकन') || query.includes('క్యూ') || query.includes('టోకెన్') || query.includes('ಕ್ಯೂ') || query.includes('ಟೋಕನ್') || query.includes('രാंग')) {
    const bookings = context?.activeBookings || [];
    const activeBooking = bookings.find((b: any) => b.status !== 'Completed') || bookings[0];
    if (activeBooking) {
      if (lang === 'ta') {
        return `🎟️ **உங்கள் நேரலை டோக்கன் மற்றும் வரிசை நிலை:**\n\n- **டோக்கன் எண்**: \`${activeBooking.tokenNumber}\`\n- **பயிர்**: ${activeBooking.crop} (${activeBooking.quantityQuintals} குவிண்டால்)\n- **கொள்முதல் மையம்**: ${activeBooking.centreName}\n- **நிலை**: ${activeBooking.status}\n- **முன்னால் உள்ள விவசாயிகள்**: சுமார் 3-4 வாகனங்கள்\n\nஉங்கள் டோக்கன் வாயில் திரையில் அழைக்கப்படும்போது SMS அறிவிப்பு வரும். 'நேரலை வரிசை' பக்கத்தில் உங்கள் நிகழ்நேர முன்னேற்றத்தை தொடர்ந்து பார்க்கலாம்.`;
      }
      if (lang === 'hi') {
        return `🎟️ **आपका लाइव खरीद टोकन और कतार स्थिति:**\n\n- **टोकन संख्या**: \`${activeBooking.tokenNumber}\`\n- **फसल**: ${activeBooking.crop} (${activeBooking.quantityQuintals} क्विंटल)\n- **खरीद केंद्र**: ${activeBooking.centreName}\n- **वर्तमान स्थिति**: ${activeBooking.status}\n- **आगे किसान**: लगभग 3-4 वाहन\n\nइलेक्ट्रॉनिक तौल कांटे पर बुलाए जाने पर आपको तुरंत एसएमएस और स्क्रीन सूचना प्राप्त होगी।`;
      }
      if (lang === 'te') {
        return `🎟️ **మీ లైవ్ సేకరణ టోకెన్ & క్యూ స్థితి:**\n\n- **టోకెన్ సంఖ్య**: \`${activeBooking.tokenNumber}\`\n- **పంట**: ${activeBooking.crop} (${activeBooking.quantityQuintals} క్వింటాళ్లు)\n- **కేంద్రం**: ${activeBooking.centreName}\n- **ప్రస్తుత దశ**: ${activeBooking.status}\n- **ముందున్న రైతులు**: దాదాపు 3-4 వాహనాలు\n\nఎలక్ట్రానిక్ వేబ్రిడ్జ్ వద్దకు పిలిచినప్పుడు మీకు SMS అందుతుంది.`;
      }
      return `🎟️ **Your Active Procurement Token & Queue Telemetry:**\n\n- **Token Number**: \`${activeBooking.tokenNumber}\`\n- **Crop & Quantity**: ${activeBooking.crop} — ${activeBooking.quantityQuintals} Quintals\n- **Assigned Centre**: ${activeBooking.centreName}\n- **Current Stage**: ${activeBooking.status}\n- **Vehicles Ahead**: ~3-4 trucks in Bay 2\n\nYou will receive an automated gate call notification via SMS and on the 'Live Queue' tracker when your token is dispatched to the electronic weighbridge.`;
    }
    return `You currently have verified registrations. You can view all active and past tokens in the **My Tokens** or **Live Queue** tab on the left sidebar.`;
  }

  // DBT Payment status
  if (query.includes('dbt') || query.includes('payment') || query.includes('money') || query.includes('பணம்') || query.includes('வங்கி') || query.includes('भुगतान') || query.includes('డబ్బు') || query.includes('ಹಣ') || query.includes('പണം') || query.includes('पैसे')) {
    if (lang === 'ta') {
      return `💳 **DBT வங்கி வரவு மற்றும் பணம் செலுத்தும் முறை:**\n\n- தரம் மற்றும் எடை ஒப்புதலுக்குப் பிறகு **PFMS (Public Financial Management System)** மூலம் நேரடியாக விவசாயியின் ஆதார் இணைக்கப்பட்ட வங்கிக் கணக்கிற்கு பணம் செலுத்தப்படுகிறது.\n- பரிசீலனை காலம்: **48 முதல் 72 மணி நேரம்**.\n- 'வங்கி DBT வரவுகள்' பக்கத்தில் உங்கள் PFMS UTR குறிப்பு எண் மற்றும் டிஜிட்டல் J-Form ரசீதை பதிவிறக்கம் செய்துகொள்ளலாம்.`;
    }
    if (lang === 'hi') {
      return `💳 **डीबीटी भुगतान और बैंक निपटान प्रक्रिया:**\n\n- इलेक्ट्रॉनिक तौल और गुणवत्ता परीक्षण पास होने के बाद, सरकारी अधिकारी डिजिटल गेट पास जारी करते हैं।\n- आधार से जुड़े बैंक खाते में **PFMS** के माध्यम से **48 से 72 घंटों** में सीधे राशि अंतरित की जाती है।\n- आप 'भुगतान' अनुभाग से अपना डिजिटल जे-फॉर्म (J-Form) डाउनलोड कर सकते हैं।`;
    }
    return `💳 **DBT Payment & Bank Settlement Procedure:**\n\n- After your lot passes the electronic weighbridge and quality assay, the Procurement Officer signs the digital pass.\n- Funds are disbursed directly to your Aadhaar-seeded bank account via **PFMS / NPCI DBT** within **48 to 72 hours**.\n- You can inspect transaction references (UTR number, gross amount, and quality bonus) in the **Payments & Digital Receipts (J-Form)** section.`;
  }

  // How to book slot or use platform
  if (query.includes('how') || query.includes('book') || query.includes('slot') || query.includes('பதிவு') || query.includes('बुक') || query.includes('బుక్') || query.includes('ಬುಕ್') || query.includes('ബുക്കിംഗ്') || query.includes('बुकिंग')) {
    if (lang === 'ta') {
      return `📋 **AgriBridge கொள்முதல் நேரம் பதிவு செய்யும் வழிமுறைகள்:**\n\n1. இடதுபுற மெனுவில் **'மண்டி நேரம் பதிவு' (Book Slot)** என்பதைத் தேர்ந்தெடுக்கவும்.\n2. நீங்கள் கொண்டுவரும் பயிர் வகை மற்றும் அளவை (குவிண்டாலில்) உள்ளிடவும்.\n3. அருகிலுள்ள கொள்முதல் மண்டியைத் தேர்ந்தெடுக்கவும் (எ.கா. கர்னால் APMC).\n4. வசதியான தேதி மற்றும் நேர ஒதுக்கீட்டைத் தேர்வு செய்யவும்.\n5. உறுதிசெய்தவுடன் டிஜிட்டல் QR நுழைவு டோக்கன் உடனடியாக உருவாக்கப்படும்.`;
    }
    if (lang === 'hi') {
      return `📋 **एग्रीब्रिज पर खरीद स्लॉट बुक करने के चरण:**\n\n1. बाईं ओर के मेनू में **'स्लॉट बुक करें'** चुनें।\n2. अपनी प्रमाणित फसल और घोषित मात्रा (क्विंटल में) दर्ज करें।\n3. निकटतम APMC खरीद केंद्र चुनें।\n4. पसंदीदा तारीख और समय स्लॉट चुनें।\n5. पुष्टि करने पर आपको तुरंत डिजिटल क्यूआर टोकन प्राप्त होगा।`;
    }
    return `📋 **How to Book a Procurement Slot on AgriBridge:**\n\n1. Navigate to **Book Slot / Crop Details** in the sidebar.\n2. Choose your certified crop (e.g. Paddy Grade A, Wheat) and enter the declared quantity in Quintals.\n3. Select your nearest APMC Procurement Centre (e.g., Karnal Central APMC Hub).\n4. Pick an available date and time slot.\n5. Confirm to receive an instant digital QR token and printable gate pass.`;
  }

  // Mandis & Centres
  if (query.includes('mandi') || query.includes('centre') || query.includes('center') || query.includes('மையம்') || query.includes('मंडी') || query.includes('మండి') || query.includes('ಮಂಡಿ')) {
    const centres = context?.centres || [];
    const centreNames = centres.map((c: any) => `- **${c.name}** (${c.district || 'Haryana'}): ${c.operatingStatus || 'Operational'} — Queue: ${c.currentQueueLength || 12} farmers`).join('\n');
    return `🏢 **Active Procurement Mandi Centres:**\n\n${centreNames}\n\nEach mandi is equipped with calibrated electronic weighbridges, rapid moisture meters, and direct APMC oversight.`;
  }

  // General fallback
  if (lang === 'ta') {
    return `வணக்கம்! அக்ரிபிரிட்ஜ் (AgriBridge) AI உதவியாளரிடம் உங்கள் கொள்முதல் தகவல்கள், அரசு MSP விலைகள், மண்டி டோக்கன்கள் அல்லது நேரடி சந்தை பற்றிய எந்த கேள்வியையும் நீங்கள் கேட்கலாம். மேலே உள்ள விரைவு வினா பொத்தான்களைப் பயன்படுத்தலாம்!`;
  }
  if (lang === 'hi') {
    return `नमस्ते! एग्रीब्रिज एआई सहायक में आपका स्वागत है। आप मुझसे न्यूनतम समर्थन मूल्य (MSP), लाइव टोकन स्थिति, मंडी स्लॉट बुकिंग या प्रत्यक्ष बाजार के बारे में कोई भी सवाल पूछ सकते हैं।`;
  }
  if (lang === 'te') {
    return `నమస్కారం! అగ్రిబ్రిడ్జ్ AI అసిస్టెంట్‌కి స్వాగతం. మీరు MSP ధరలు, లైవ్ టోకెన్ వివరాలు, స్లాట్ బుకింగ్ లేదా మార్కెట్ గురించి ఏదైనా అడగవచ్చు.`;
  }
  return `Hello! I am your **AgriBridge AI Assistant**. I can answer any questions regarding official MSP procurement rates, your active lot tokens, mandi wait times, electronic weigh slips, or the direct surplus marketplace. How can I assist you today?`;
}

// In-memory cache for synthesized audio to eliminate quota exhaustion and provide instantaneous replay
const ttsAudioCache = new Map<string, { audioBase64: string; mimeType: string }>();

function isPlayableWavAudio(value: unknown): value is { audioBase64: string; mimeType: string } {
  if (typeof value !== 'object' || value === null) return false;

  const cached = value as Record<string, unknown>;
  if (typeof cached.audioBase64 !== 'string' || cached.mimeType !== 'audio/wav') return false;

  const audio = Buffer.from(cached.audioBase64, 'base64');
  return audio.toString('ascii', 0, 4) === 'RIFF' && audio.toString('ascii', 8, 12) === 'WAVE';
}

// Load pre-cached audio from disk on server start
try {
  const diskCacheFile = path.resolve(__dirname, 'src/data/tts_cache.json');
  if (fs.existsSync(diskCacheFile)) {
    const parsed: Record<string, unknown> = JSON.parse(fs.readFileSync(diskCacheFile, 'utf8'));
    for (const [key, val] of Object.entries(parsed)) {
      if (isPlayableWavAudio(val)) ttsAudioCache.set(key, val);
    }
  }
} catch (e) {
  console.warn('Could not load synthesized speech cache:', e);
}

function cleanSpeechText(text: string): string {
  return text
    .replace(/[*#_~`]/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/[🌾🎟️💳📋🏢✨🎙️⚠️✅❌•]/g, ' ')
    .replace(/•|\-/g, ', ')
    .replace(/\n+/g, '. ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitSpeechIntoChunks(text: string, maxLength = 1200): string[] {
  const sentences = text.match(/[^.!?।॥\n]+[.!?।॥\n]+|[^.!?।॥\n]+$/gu) || [text];
  const chunks: string[] = [];
  let current = '';

  for (const s of sentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;

    if (trimmed.length > maxLength) {
      if (current) {
        chunks.push(current);
        current = '';
      }

      const words = trimmed.split(/\s+/);
      let wordChunk = '';
      for (const word of words) {
        if (wordChunk && `${wordChunk} ${word}`.length > maxLength) {
          chunks.push(wordChunk);
          wordChunk = word;
        } else {
          wordChunk = wordChunk ? `${wordChunk} ${word}` : word;
        }
      }
      if (wordChunk) current = wordChunk;
      continue;
    }

    if (current && `${current} ${trimmed}`.length > maxLength) {
      chunks.push(current);
      current = trimmed;
    } else {
      current = current ? `${current} ${trimmed}` : trimmed;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function pcmToWav(pcm: Buffer, sampleRate: number, channels = 1): Buffer {
  const header = Buffer.alloc(44);
  const bytesPerSample = 2;

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  header.writeUInt16LE(channels * bytesPerSample, 32);
  header.writeUInt16LE(bytesPerSample * 8, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}

// Generate browser-playable audio for the complete response, in the requested language.
async function synthesizeSpeechAudio(text: string, language: string): Promise<{ audioBase64: string; mimeType: string } | null> {
  if (!ai) return null;
  const speechText = cleanSpeechText(text);
  if (!speechText) return null;

  const cacheKey = `${language}:${speechText.toLowerCase()}`;
  if (ttsAudioCache.has(cacheKey)) {
    return ttsAudioCache.get(cacheKey)!;
  }

  const languageName = LANG_NAMES[language] || LANG_NAMES.en;
  const audioChunks: Buffer[] = [];
  let sampleRate = 24000;

  try {
    for (const chunk of splitSpeechIntoChunks(speechText)) {
      const ttsResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: `Read this text aloud in ${languageName}. Preserve the original language and wording; do not translate or summarize:\n${chunk}`,
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const audioPart = ttsResponse.candidates?.[0]?.content?.parts?.find(
        part => part.inlineData?.data
      );
      if (!audioPart?.inlineData?.data) {
        throw new Error(`Gemini TTS returned no audio for language ${language}`);
      }

      const mimeType = audioPart.inlineData.mimeType || '';
      const sampleRateMatch = mimeType.match(/rate=(\d+)/i);
      if (sampleRateMatch) sampleRate = Number(sampleRateMatch[1]);
      audioChunks.push(Buffer.from(audioPart.inlineData.data, 'base64'));
    }
  } catch (err) {
    console.warn(`Gemini TTS failed for language ${language}:`, err);
    return null;
  }

  const wav = pcmToWav(Buffer.concat(audioChunks), sampleRate);
  const result = { audioBase64: wav.toString('base64'), mimeType: 'audio/wav' };

  if (ttsAudioCache.size >= 300) {
    const firstKey = ttsAudioCache.keys().next().value;
    if (firstKey) ttsAudioCache.delete(firstKey);
  }
  ttsAudioCache.set(cacheKey, result);

  try {
    const diskCacheFile = path.resolve(__dirname, 'src/data/tts_cache.json');
    let current: Record<string, { audioBase64: string; mimeType: string }> = {};
    if (fs.existsSync(diskCacheFile)) {
      current = JSON.parse(fs.readFileSync(diskCacheFile, 'utf8'));
    }
    current[cacheKey] = result;
    fs.writeFileSync(diskCacheFile, JSON.stringify(current, null, 2));
  } catch (saveErr) {
    console.warn('Could not persist synthesized speech cache:', saveErr);
  }

  return result;
}

// AI Assistant Chat Endpoint
app.post('/api/assistant/chat', async (req: Request, res: Response) => {
  try {
    const { message, history = [], context = {}, language = 'en' } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message text is required' });
    }
    if (!isLanguageCode(language)) {
      return res.status(400).json({ error: 'A supported language code is required' });
    }

    const targetLangName = LANG_NAMES[language] || 'English';

    // Build comprehensive system prompt with live application context
    const currentUser = context.currentUser;
    const activeBookings = context.activeBookings || [];
    const centres = context.centres || [];

    const systemInstruction = `You are the official AI Voice & Procurement Assistant for "AgriBridge" — the National Government Agricultural E-Procurement & Direct Surplus Marketplace Portal (e-NAM & APMC integrated).
Your role is to assist farmers, procurement officers, institutional buyers, and village staff with natural language questions.

Current Session & Context:
- User: ${currentUser ? `${currentUser.name} (${currentUser.role.toUpperCase()}) from ${currentUser.location || 'Karnal, Haryana'}` : 'Guest User'}
- User Active Language Preference: ${targetLangName} (code: ${language})
- User's Active Procurement Bookings & Tokens: ${JSON.stringify(activeBookings.slice(0, 5))}
- Active Mandi Centres & Real-Time Queue Status: ${JSON.stringify(centres.slice(0, 5))}
- Official Kharif & Rabi MSP Rate Card (Government Gazette):
  * Paddy (Grade A): ₹2,320 / Quintal (Moisture limit: 17.0%, Foreign matter: 1.0%)
  * Paddy (Common): ₹2,300 / Quintal
  * Wheat (Gehun): ₹2,275 / Quintal (Moisture limit: 12.0%)
  * Maize (Makka): ₹2,225 / Quintal (Moisture limit: 14.0%)
  * Groundnut (Mungfali): ₹6,783 / Quintal (Moisture limit: 8.0%)
  * Soybean: ₹4,892 / Quintal (Moisture limit: 12.0%)
  * Cotton (Kapas): ₹7,121 / Quintal (Moisture limit: 8.0%)
  * Gram (Chana): ₹5,440 / Quintal (Moisture limit: 10.0%)

CRITICAL MULTILINGUAL & VOICE INSTRUCTIONS:
1. The user's active selected language is "${targetLangName}". You MUST answer fluently and naturally in ${targetLangName}.
2. If the user writes or speaks in English, Tamil, Hindi, Telugu, Kannada, Malayalam, Marathi, or transliterated script (e.g. Tanglish or Hinglish), understand the intent accurately and provide your answer in ${targetLangName}.
3. Always be respectful, polite, authoritative, and helpful to the farmer or agricultural stakeholder.
4. When discussing prices, quote exact government MSP figures and specify that payment is made directly through PFMS Aadhaar DBT within 48-72 hours.
5. When discussing booking or tokens, reference their active token numbers and queue positions if available in context.
6. Provide concise, well-formatted markdown responses with bullet points and bold key terms.
7. The toll-free farmer helpline is 1800-180-1551.`;

    let replyText = '';
    let source = 'gemini-3.8-flash';

    if (ai) {
      try {
        const contents: any[] = [];
        
        for (const item of (history as ChatHistoryItem[]).slice(-6)) {
          contents.push({
            role: item.role === 'model' ? 'model' : 'user',
            parts: [{ text: item.text }],
          });
        }

        contents.push({
          role: 'user',
          parts: [{ text: message }],
        });

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: contents,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.6,
            topP: 0.95,
          },
        });

        replyText = response.text || generateContextualFallbackAnswer(message, context, language);
      } catch (geminiError: any) {
        console.warn('Gemini chat failed, switching to contextual fallback:', geminiError?.message || geminiError);
        replyText = generateContextualFallbackAnswer(message, context, language);
        source = 'context-engine';
      }
    } else {
      replyText = generateContextualFallbackAnswer(message, context, language);
      source = 'context-engine';
    }

    // Synthesize the complete response; TTS is optional so text chat remains available.
    const speechText = cleanSpeechText(replyText);
    let audioData: { audioBase64: string; mimeType: string } | null = null;
    try {
      audioData = await synthesizeSpeechAudio(speechText, language);
    } catch (audioErr) {
      console.warn(`Audio synthesis skipped for language ${language}:`, audioErr);
    }

    return res.json({
      reply: replyText,
      speechText,
      audioBase64: audioData ? audioData.audioBase64 : null,
      mimeType: audioData ? audioData.mimeType : 'audio/wav',
      source,
      language
    });
  } catch (error: any) {
    console.error('Error in /api/assistant/chat:', error);
    return res.status(500).json({ error: 'Internal server error processing assistant query' });
  }
});

// Server-side speech-to-text fallback for browser speech service outages.
app.post('/api/assistant/transcribe', async (req: Request, res: Response) => {
  const { audioBase64, mimeType, language } = req.body || {};
  const languageName = SPEECH_RECOGNITION_LANGUAGES[language];

  if (!languageName) {
    return res.status(400).json({ error: 'A supported language code is required' });
  }
  if (typeof audioBase64 !== 'string' || !audioBase64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(audioBase64)) {
    return res.status(400).json({ error: 'Valid base64 audio is required' });
  }
  if (typeof mimeType !== 'string' || !/^audio\/(webm|wav|mp4|ogg|mpeg|mp3|aac|flac)(;[^,]*)?$/i.test(mimeType)) {
    return res.status(415).json({ error: 'Unsupported audio format' });
  }

  const audioBuffer = Buffer.from(audioBase64, 'base64');
  if (audioBuffer.length < 256) {
    return res.status(400).json({ error: 'The recording is empty or too short' });
  }
  if (audioBuffer.length > 3_500_000) {
    return res.status(413).json({ error: 'Recording is too large; keep voice questions under 45 seconds' });
  }
  if (!ai) {
    return res.status(503).json({ error: 'Gemini transcription is unavailable; configure GEMINI_API_KEY on the server' });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{
        role: 'user',
        parts: [
          {
            text: `Transcribe the spoken words in this audio exactly as spoken in ${languageName}. Do not translate, summarize, or add commentary. Return only the transcription.`,
          },
          {
            inlineData: {
              mimeType,
              data: audioBase64,
            },
          },
        ],
      }],
      config: {
        temperature: 0,
      },
    });

    const transcript = response.text?.trim();
    if (!transcript) {
      return res.status(422).json({ error: `No ${languageName} speech could be recognized` });
    }

    return res.json({ transcript, language });
  } catch (error) {
    console.error(`Gemini transcription failed for ${language}:`, error);
    return res.status(502).json({ error: 'Speech transcription service failed' });
  }
});

// Multilingual TTS (Text-to-Speech) Endpoint powered by gemini-3.8-flash-lite-tts
app.post('/api/assistant/tts', async (req: Request, res: Response) => {
  try {
    const { text, language = 'en' } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text string is required' });
    }
    if (!isLanguageCode(language)) {
      return res.status(400).json({ error: 'A supported language code is required' });
    }

    if (!ai) {
      return res.status(503).json({ error: 'Gemini API not configured' });
    }

    const audioResult = await synthesizeSpeechAudio(text, language);
    if (audioResult && audioResult.audioBase64) {
      return res.json({
        audioBase64: audioResult.audioBase64,
        mimeType: audioResult.mimeType,
        language,
      });
    }

    return res.status(429).json({ error: 'Gemini Voice busy or rate limited', fallbackToClient: true });
  } catch (err: any) {
    console.error('Error in /api/assistant/tts:', err);
    return res.status(500).json({ error: 'TTS server error' });
  }
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  void checkDatabase().then(databaseConnected => res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? 'ok' : 'degraded',
    geminiConfigured: !!apiKey,
    database: databaseConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  }));
});

app.use('/api', apiRouter);
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});
app.use('/api', apiErrorHandler);

async function start() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, HOST, () => {
    const displayHost = HOST === '127.0.0.1' ? 'localhost' : HOST;
    console.log(`AgriBridge Server listening at http://${displayHost}:${PORT} (dev/full-stack)`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
