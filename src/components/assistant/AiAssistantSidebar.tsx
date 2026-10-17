import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  Copy, 
  Check, 
  Trash2, 
  Languages,
  CheckCircle2,
  Wheat,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  AudioWaveform,
  RotateCcw
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LanguageCode } from '../../types';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  source?: string;
  wasSpoken?: boolean;
  language?: LanguageCode;
  audioBase64?: string;
  mimeType?: string;
}

interface LanguageVoiceConfig {
  code: LanguageCode;
  label: string;
  native: string;
  flag: string;
  bcp47: string;
  speechSynthesisCodes: string[];
  sampleQuestions: { label: string; query: string }[];
  listeningPrompt: string;
  placeholder: string;
}

interface VoiceRecognitionSession {
  cancelled: boolean;
  submitted: boolean;
  transcript: string;
  originalInput: string;
  language: LanguageCode;
  audioChunks: Blob[];
  audioMimeType: string;
  audioRecorder: MediaRecorder | null;
  audioStream: MediaStream;
  recordingStopPromise?: Promise<Blob | null>;
  error?: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

// All 7 supported languages with full Gemini Voice synthesis and Speech-to-Text configuration
export const VOICE_LANGUAGES: LanguageVoiceConfig[] = [
  { 
    code: 'ta', 
    label: 'Tamil', 
    native: 'தமிழ்', 
    flag: '🇮🇳',
    bcp47: 'ta-IN',
    speechSynthesisCodes: ['ta-in', 'ta_in', 'ta', 'tamil', 'தமிழ்', 'valluvar', 'latha'],
    listeningPrompt: 'தமிழில் கேட்கிறது... உங்கள் கேள்வியைப் பேசவும்',
    placeholder: 'தமிழில் கேளுங்கள்: MSP விலை, டோக்கன் நிலை, எடைச் சீட்டு...',
    sampleQuestions: [
      { label: 'இன்றைய நெல் & கோதுமை MSP விலை', query: '2024-2026 க்கான நெல் மற்றும் கோதுமை அரசு குறைந்தபட்ச ஆதரவு விலை (MSP) என்ன?' },
      { label: 'என் டோக்கன் மற்றும் வரிசை நிலை', query: 'என் டோக்கன் எண் என்ன மற்றும் கொள்முதல் மையத்தில் எனக்கு முன் எத்தனை விவசாயிகள் உள்ளனர்?' },
      { label: 'மண்டி ஸ்லாட் முன்பதிவு செய்வது எப்படி?', query: 'கொள்முதல் மையத்தில் நெல் விற்பனை செய்ய புதிய ஸ்லாட் முன்பதிவு செய்வது எப்படி?' },
      { label: 'வங்கி DBT பணம் எப்போது வரும்?', query: 'தானிய எடை முடிந்த பிறகு விவசாயிகளின் வங்கிக் கணக்கில் DBT பணம் வரவு வைக்க எவ்வளவு நேரம் ஆகும்?' },
      { label: 'கர்னால் கொள்முதல் மைய விவரம்', query: 'கர்னால் கொள்முதல் மையத்தின் இன்றைய இருப்பு ஸ்லாட்டுகள் மற்றும் நிலை என்ன?' },
    ]
  },
  { 
    code: 'hi', 
    label: 'Hindi', 
    native: 'हिन्दी', 
    flag: '🇮🇳',
    bcp47: 'hi-IN',
    speechSynthesisCodes: ['hi-in', 'hi_in', 'hi', 'hindi', 'हिन्दी', 'lekha', 'kalpana', 'neerja', 'hemant'],
    listeningPrompt: 'हिन्दी में सुन रहा है... अपना सवाल बोलें',
    placeholder: 'एमएसपी दर, टोकन कतार, वे-स्लिप या स्लॉट के बारे में पूछें...',
    sampleQuestions: [
      { label: 'आज का धान और गेहूं MSP समर्थन मूल्य', query: 'वर्तमान सत्र के लिए धान और गेहूं का सरकारी न्यूनतम समर्थन मूल्य (MSP) क्या है?' },
      { label: 'मेरी टोकन संख्या और कतार स्थिति', query: 'मेरा वर्तमान टोकन नंबर क्या है और खरीद केंद्र पर मेरे आगे कितने किसान हैं?' },
      { label: 'मंडी में स्लॉट कैसे बुक करें?', query: 'खरीद केंद्र पर अपनी फसल बेचने के लिए नया स्लॉट कैसे बुक करें?' },
      { label: 'डीबीटी बैंक खाते में भुगतान समय', query: 'वजन पर्ची जारी होने के बाद किसान के बैंक खाते में सीधा DBT भुगतान कब तक आता है?' },
      { label: 'करनाल खरीद केंद्र संचालन स्थिति', query: 'करनाल खरीद केंद्र पर आज उपलब्ध स्लॉट और कतार की स्थिति क्या है?' },
    ]
  },
  { 
    code: 'te', 
    label: 'Telugu', 
    native: 'తెలుగు', 
    flag: '🇮🇳',
    bcp47: 'te-IN',
    speechSynthesisCodes: ['te-in', 'te_in', 'te', 'telugu', 'తెలుగు', 'chitra', 'mohan'],
    listeningPrompt: 'తెలుగులో వింటోంది... మీ ప్రశ్న మాట్లాడండి',
    placeholder: 'MSP మద్దతు ధరలు, టోకెన్, క్యూ వివరాల గురించి అడగండి...',
    sampleQuestions: [
      { label: 'ఈరోజు ధాన్యం & గోధుమ MSP మద్దతు ధర', query: 'ధాన్యం మరియు గోధుమల ప్రస్తుత ప్రభుత్వ కనీస మద్దతు ధర (MSP) ఎంత?' },
      { label: 'నా టోకెన్ & క్యూ వివరాలు', query: 'నా టోకెన్ నంబర్ ఎంత మరియు క్యూలో నా ముందు ఎంతమంది రైతులు ఉన్నారు?' },
      { label: 'కొనుగోలు స్లాట్ ఎలా బుక్ చేయాలి?', query: 'మండీలో ధాన్యం అమ్మకానికి కొత్త స్లాట్ ఎలా బుక్ చేసుకోవాలి?' },
      { label: 'బ్యాంకు ఖాతాలో DBT చెల్లింపు', query: 'తూకం పూర్తయిన తర్వాత రైతు బ్యాంక్ ఖాతాలో DBT డబ్బు ఎప్పుడు జమ అవుతుంది?' },
      { label: 'కర్నాల్ కేంద్రం తాజా వివరాలు', query: 'కర్నాల్ కొనుగోలు కేంద్రంలో నేటి స్లాట్లు మరియు రద్దీ పరిస్థితి ఏమిటి?' },
    ]
  },
  { 
    code: 'kn', 
    label: 'Kannada', 
    native: 'ಕನ್ನಡ', 
    flag: '🇮🇳',
    bcp47: 'kn-IN',
    speechSynthesisCodes: ['kn-in', 'kn_in', 'kn', 'kannada', 'ಕನ್ನಡ', 'sapna'],
    listeningPrompt: 'ಕನ್ನಡದಲ್ಲಿ ಕೇಳುತ್ತಿದೆ... ನಿಮ್ಮ ಪ್ರಶ್ನೆ ಮಾತನಾಡಿ',
    placeholder: 'MSP ಬೆಂಬಲ ಬೆಲೆ, ಟೋಕನ್ ಕ್ಯೂ, ಸ್ಲಾಟ್ ಬುಕಿಂಗ್ ಬಗ್ಗೆ ಕೇಳಿ...',
    sampleQuestions: [
      { label: 'ಇಂದಿನ ಭತ್ತ ಮತ್ತು ಗೋಧಿ MSP ಬೆಲೆ', query: 'ಪ್ರಸ್ತುತ ಸಾಲಿನ ಭತ್ತ ಮತ್ತು ಗೋಧಿಯ ಸರ್ಕಾರದ ಕನಿಷ್ಠ ಬೆಂಬಲ ಬೆಲೆ (MSP) ಎಷ್ಟು?' },
      { label: 'ನನ್ನ ಟೋಕನ್ ಮತ್ತು ಕ್ಯೂ ಸ್ಥಿತಿ', query: 'ನನ್ನ ಪ್ರಸ್ತುತ ಟೋಕನ್ ಸಂಖ್ಯೆ ಏನು ಮತ್ತು ಸರದಿಯಲ್ಲಿ ನನ್ನ ಮುಂದೆ ಎಷ್ಟು ಜನರಿದ್ದಾರೆ?' },
      { label: 'ಮಂಡಿ ಸ್ಲಾಟ್ ಬುಕ್ ಮಾಡುವುದು ಹೇಗೆ?', query: 'ಬೆಳೆ ಮಾರಾಟ ಮಾಡಲು ಎಪಿಎಂಸಿ ಮಂಡಿಯಲ್ಲಿ ಹೊಸ ಸ್ಲಾಟ್ ಬುಕ್ ಮಾಡುವುದು ಹೇಗೆ?' },
      { label: 'ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ DBT ಪಾವತಿ', query: 'ತೂಕ ಮಾಡಿದ ನಂತರ ರೈತರ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ಡಿಬಿಟಿ ಹಣ ಯಾವಾಗ ಜಮೆಯಾಗುತ್ತದೆ?' },
      { label: 'ಕರ್ನಾಲ್ ಖರೀದಿ ಕೇಂದ್ರದ ಸ್ಥಿತಿ', query: 'ಕರ್ನಾಲ್ ಖರೀದಿ ಕೇಂದ್ರದಲ್ಲಿ ಇಂದಿನ ಲಭ್ಯವಿರುವ ಸ್ಲಾಟ್‌ಗಳು ಎಷ್ಟು?' },
    ]
  },
  { 
    code: 'mr', 
    label: 'Marathi', 
    native: 'मराठी', 
    flag: '🇮🇳',
    bcp47: 'mr-IN',
    speechSynthesisCodes: ['mr-in', 'mr_in', 'mr', 'marathi', 'मराठी', 'aarohi'],
    listeningPrompt: 'मराठीत ऐकत आहे... आपला प्रश्न बोला',
    placeholder: 'हमीभाव (MSP), टोकन रांग, वजन पावती, डीबीटी बद्दल विचारा...',
    sampleQuestions: [
      { label: 'आजचा भात व गहू हमीभाव (MSP)', query: 'चालू हंगामासाठी भात आणि गव्हाचा अधिकृत शासकीय किमान आधारभूत भाव (MSP) काय आहे?' },
      { label: 'माझा टोकन आणि रांगेची स्थिती', query: 'माझा सध्याचा टोकन क्रमांक काय आहे आणि खरेदी केंद्रावर माझ्या पुढे किती शेतकरी आहेत?' },
      { label: 'बाजार समितीत स्लॉट कसा बुक करावा?', query: 'धान्य विक्रीसाठी खरेदी केंद्रावर नवीन स्लॉट कसा बुक करावा?' },
      { label: 'बँक खात्यात थेट DBT रक्कम कधी मिळते?', query: 'वजन पावती तयार झाल्यानंतर शेतकऱ्यांच्या बँक खात्यात थेट डीबीटी रक्कम कधी जमा होते?' },
      { label: 'कर्नाल खरेदी केंद्र चालू स्थिती', query: 'कर्नाल खरेदी केंद्रावर आज उपलब्ध स्लॉट आणि रांगेची स्थिती काय आहे?' },
    ]
  },
  { 
    code: 'en', 
    label: 'English', 
    native: 'English', 
    flag: '🇬🇧',
    bcp47: 'en-IN',
    speechSynthesisCodes: ['en-in', 'en_in', 'india', 'rishi', 'veena', 'en-gb', 'en-us'],
    listeningPrompt: 'Listening in English... Speak your question now',
    placeholder: 'Ask about MSP rates, token queue, weigh-slip, DBT payments...',
    sampleQuestions: [
      { label: "Today's Paddy & Wheat MSP Rates", query: 'What is the official Government MSP rate for Paddy and Wheat this season?' },
      { label: 'Check My Token & Queue Status', query: 'What is my current procurement token number, queue position, and wait time?' },
      { label: 'How to Book Mandi Slot', query: 'How can I book an APMC mandi procurement slot for my produce?' },
      { label: 'DBT Payment Timeline & Bank', query: 'How long does direct PFMS DBT bank payment take after weighment?' },
      { label: 'Centre Operating Status', query: 'Which APMC procurement centres are active in Karnal and what are their queue lengths?' },
    ]
  },
  { 
    code: 'ml', 
    label: 'Malayalam', 
    native: 'മലയാളം', 
    flag: '🇮🇳',
    bcp47: 'ml-IN',
    speechSynthesisCodes: ['ml-in', 'ml_in', 'ml', 'malayalam', 'മലയാളം', 'midhun'],
    listeningPrompt: 'മലയാളത്തിൽ കേൾക്കുന്നു... ചോദ്യം പറയൂ',
    placeholder: 'MSP നിരക്കുകൾ, ടോക്കൺ ക്യൂ, വെയ്മെന്റ് വിവരങ്ങൾ ചോദിക്കൂ...',
    sampleQuestions: [
      { label: 'ഇന്നത്തെ നെല്ല് & ഗോതമ്പ് MSP നിരക്ക്', query: 'നെല്ലിന്റെയും ഗോതമ്പിന്റെയും ഔദ്യോഗിക സർക്കാർ താങ്ങുവില (MSP) എത്രയാണ്?' },
      { label: 'എന്റെ ടോക്കണും ക്യൂ നിലയും', query: 'എന്റെ ടോക്കൺ നമ്പർ എന്താണ്, സംഭരണ കേന്ദ്രത്തിൽ എത്ര കർഷകർ എന്റെ മുന്നിലുണ്ട്?' },
      { label: 'സംഭരണ സ്ലോട്ട് എങ്ങനെ ബുക്ക് ചെയ്യാം?', query: 'മണ്ടിയിൽ വിള വിൽക്കുന്നതിനായി പുതിയ സ്ലോട്ട് എങ്ങനെ ബുക്ക് ചെയ്യാം?' },
      { label: 'ബാങ്ക് അക്കൗണ്ടിലേക്ക് DBT പേയ്മെന്റ്', query: 'തൂക്കം കഴിഞ്ഞാൽ കർഷകരുടെ ബാങ്ക് അക്കൗണ്ടിൽ DBT തുക എപ്പോൾ എത്തും?' },
      { label: 'കർണാൽ സംഭരണ കേന്ദ്രം വിവരങ്ങൾ', query: 'കർണാൽ സംഭരണ കേന്ദ്രത്തിലെ ഇന്നത്തെ സ്ലോട്ടുകളും സ്ഥിതിയും എന്താണ്?' },
    ]
  },
];

// Clean markdown text for human-sounding speech output without annoying code/emoji artifacts
function cleanMarkdownForSpeech(text: string): string {
  return text
    .replace(/[*#_~`]/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/[🌾🎟️💳📋🏢✨🎙️⚠️✅❌•]/g, ' ')
    .replace(/•|\-/g, ', ')
    .replace(/\n+/g, '. ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Split long text into natural sentence chunks
function splitIntoSentenceChunks(text: string): string[] {
  const sentences = text.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const s of sentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    if ((currentChunk + ' ' + trimmed).length > 160) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = trimmed;
    } else {
      currentChunk = currentChunk ? currentChunk + ' ' + trimmed : trimmed;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  return chunks.length > 0 ? chunks : [text];
}

const VOICE_INPUT_MESSAGES: Record<string, Record<string, string>> = {
  en: {
    permission: 'Microphone permission was denied. Allow microphone access in your browser settings, then try again.',
    noSpeech: 'No speech was detected. Check your microphone and try again.',
    unsupportedLanguage: 'Speech recognition for this language is unavailable in this browser.',
    noMic: 'No microphone was found. Connect or enable a microphone, or continue by typing.',
    serviceFallback: 'The browser speech service is unavailable. Trying secure server-side transcription...',
    serviceUnavailable: 'The browser speech service is unavailable and server transcription could not be used. Try again later or type your message.',
    transcriptionFailed: 'Server-side transcription failed. Check your connection and try again, or type your message.',
    noTranscript: 'No speech could be transcribed. Please try again or type your message.',
    audioTooLarge: 'The recording is too long. Keep voice questions under 45 seconds and try again.',
    unsupportedBrowser: 'Voice recognition is unavailable in this browser. Use Chrome or type your message.',
    network: 'Speech recognition could not connect to the browser speech service. Check your connection or type your message.',
  },
  ta: {
    permission: 'மைக்ரோஃபோன் அனுமதி மறுக்கப்பட்டது. உலாவி அமைப்புகளில் அனுமதித்து மீண்டும் முயற்சிக்கவும்.',
    noSpeech: 'குரல் கேட்கவில்லை. மைக்ரோஃபோனைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.',
    unsupportedLanguage: 'இந்த உலாவியில் இந்த மொழிக்கான பேச்சு அங்கீகாரம் கிடைக்கவில்லை.',
    noMic: 'மைக்ரோஃபோன் கிடைக்கவில்லை. இணைத்து மீண்டும் முயற்சிக்கவும் அல்லது தட்டச்சு செய்யவும்.',
    serviceFallback: 'உலாவி பேச்சுச் சேவை கிடைக்கவில்லை. பாதுகாப்பான சர்வர் வழி உரைமாற்றம் முயற்சிக்கப்படுகிறது...',
    serviceUnavailable: 'உலாவி பேச்சுச் சேவை மற்றும் சர்வர் உரைமாற்றம் கிடைக்கவில்லை. பின்னர் முயற்சிக்கவும் அல்லது தட்டச்சு செய்யவும்.',
    transcriptionFailed: 'சர்வர் உரைமாற்றம் தோல்வியடைந்தது. இணையத்தைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும் அல்லது தட்டச்சு செய்யவும்.',
    noTranscript: 'பேச்சை உரையாக மாற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும் அல்லது தட்டச்சு செய்யவும்.',
    audioTooLarge: 'பதிவு மிக நீளமாக உள்ளது. 45 வினாடிகளுக்குள் கேள்வியைக் கேட்டு மீண்டும் முயற்சிக்கவும்.',
    unsupportedBrowser: 'இந்த உலாவியில் குரல் அங்கீகாரம் கிடைக்கவில்லை. Chrome பயன்படுத்தவும் அல்லது தட்டச்சு செய்யவும்.',
    network: 'உலாவியின் பேச்சுச் சேவையுடன் இணைக்க முடியவில்லை. இணையத்தைச் சரிபார்க்கவும் அல்லது தட்டச்சு செய்யவும்.',
  },
  hi: {
    permission: 'माइक्रोफ़ोन अनुमति अस्वीकृत है। ब्राउज़र सेटिंग में अनुमति देकर फिर कोशिश करें।',
    noSpeech: 'कोई आवाज़ नहीं मिली। माइक्रोफ़ोन जाँचें और फिर कोशिश करें।',
    unsupportedLanguage: 'इस ब्राउज़र में इस भाषा की वाक् पहचान उपलब्ध नहीं है।',
    noMic: 'माइक्रोफ़ोन नहीं मिला। इसे कनेक्ट करें या संदेश टाइप करें।',
    serviceFallback: 'ब्राउज़र की वाक् सेवा उपलब्ध नहीं है। सुरक्षित सर्वर ट्रांसक्रिप्शन आज़माया जा रहा है...',
    serviceUnavailable: 'ब्राउज़र की वाक् सेवा और सर्वर ट्रांसक्रिप्शन उपलब्ध नहीं हैं। बाद में कोशिश करें या संदेश टाइप करें।',
    transcriptionFailed: 'सर्वर ट्रांसक्रिप्शन विफल हुआ। कनेक्शन जाँचें और फिर कोशिश करें या संदेश टाइप करें।',
    noTranscript: 'आवाज़ को टेक्स्ट में नहीं बदला जा सका। फिर कोशिश करें या संदेश टाइप करें।',
    audioTooLarge: 'रिकॉर्डिंग बहुत लंबी है। 45 सेकंड से छोटा सवाल बोलकर फिर कोशिश करें।',
    unsupportedBrowser: 'इस ब्राउज़र में वॉइस पहचान उपलब्ध नहीं है। Chrome इस्तेमाल करें या संदेश टाइप करें।',
    network: 'ब्राउज़र की वाक् सेवा से कनेक्ट नहीं हो सका। कनेक्शन जाँचें या संदेश टाइप करें।',
  },
  te: {
    permission: 'మైక్రోఫోన్ అనుమతి నిరాకరించబడింది. బ్రౌజర్ సెట్టింగ్‌లలో అనుమతించి మళ్లీ ప్రయత్నించండి.',
    noSpeech: 'మాట వినిపించలేదు. మైక్రోఫోన్‌ను తనిఖీ చేసి మళ్లీ ప్రయత్నించండి.',
    unsupportedLanguage: 'ఈ బ్రౌజర్‌లో ఈ భాషకు మాట గుర్తింపు అందుబాటులో లేదు.',
    noMic: 'మైక్రోఫోన్ కనబడలేదు. దాన్ని కనెక్ట్ చేయండి లేదా సందేశాన్ని టైప్ చేయండి.',
    serviceFallback: 'బ్రౌజర్ స్పీచ్ సేవ అందుబాటులో లేదు. సురక్షిత సర్వర్ ట్రాన్స్‌క్రిప్షన్ ప్రయత్నిస్తోంది...',
    serviceUnavailable: 'బ్రౌజర్ స్పీచ్ సేవ మరియు సర్వర్ ట్రాన్స్‌క్రిప్షన్ అందుబాటులో లేవు. తర్వాత ప్రయత్నించండి లేదా టైప్ చేయండి.',
    transcriptionFailed: 'సర్వర్ ట్రాన్స్‌క్రిప్షన్ విఫలమైంది. కనెక్షన్‌ను తనిఖీ చేసి మళ్లీ ప్రయత్నించండి లేదా టైప్ చేయండి.',
    noTranscript: 'మాటను టెక్స్ట్‌గా మార్చలేకపోయాం. మళ్లీ ప్రయత్నించండి లేదా టైప్ చేయండి.',
    audioTooLarge: 'రికార్డింగ్ చాలా పొడవుగా ఉంది. 45 సెకన్లలోపు ప్రశ్న అడిగి మళ్లీ ప్రయత్నించండి.',
    unsupportedBrowser: 'ఈ బ్రౌజర్‌లో వాయిస్ గుర్తింపు అందుబాటులో లేదు. Chrome ఉపయోగించండి లేదా టైప్ చేయండి.',
    network: 'బ్రౌజర్ స్పీచ్ సేవకు కనెక్ట్ కాలేకపోయింది. కనెక్షన్‌ను తనిఖీ చేయండి లేదా టైప్ చేయండి.',
  },
  kn: {
    permission: 'ಮೈಕ್ರೊಫೋನ್ ಅನುಮತಿಯನ್ನು ನಿರಾಕರಿಸಲಾಗಿದೆ. ಬ್ರೌಸರ್ ಸೆಟ್ಟಿಂಗ್‌ಗಳಲ್ಲಿ ಅನುಮತಿ ನೀಡಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    noSpeech: 'ಮಾತು ಪತ್ತೆಯಾಗಿಲ್ಲ. ಮೈಕ್ರೊಫೋನ್ ಪರಿಶೀಲಿಸಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    unsupportedLanguage: 'ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಈ ಭಾಷೆಯ ಮಾತು ಗುರುತಿಸುವಿಕೆ ಲಭ್ಯವಿಲ್ಲ.',
    noMic: 'ಮೈಕ್ರೊಫೋನ್ ಕಂಡುಬಂದಿಲ್ಲ. ಅದನ್ನು ಸಂಪರ್ಕಿಸಿ ಅಥವಾ ಸಂದೇಶವನ್ನು ಟೈಪ್ ಮಾಡಿ.',
    serviceFallback: 'ಬ್ರೌಸರ್ ಮಾತು ಸೇವೆ ಲಭ್ಯವಿಲ್ಲ. ಸುರಕ್ಷಿತ ಸರ್ವರ್ ಲಿಪ್ಯಂತರವನ್ನು ಪ್ರಯತ್ನಿಸಲಾಗುತ್ತಿದೆ...',
    serviceUnavailable: 'ಬ್ರೌಸರ್ ಮಾತು ಸೇವೆ ಮತ್ತು ಸರ್ವರ್ ಲಿಪ್ಯಂತರ ಲಭ್ಯವಿಲ್ಲ. ನಂತರ ಪ್ರಯತ್ನಿಸಿ ಅಥವಾ ಟೈಪ್ ಮಾಡಿ.',
    transcriptionFailed: 'ಸರ್ವರ್ ಲಿಪ್ಯಂತರ ವಿಫಲವಾಗಿದೆ. ಸಂಪರ್ಕ ಪರಿಶೀಲಿಸಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ ಅಥವಾ ಟೈಪ್ ಮಾಡಿ.',
    noTranscript: 'ಮಾತನ್ನು ಪಠ್ಯವಾಗಿ ಪರಿವರ್ತಿಸಲಾಗಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ ಅಥವಾ ಟೈಪ್ ಮಾಡಿ.',
    audioTooLarge: 'ರೆಕಾರ್ಡಿಂಗ್ ತುಂಬಾ ಉದ್ದವಾಗಿದೆ. 45 ಸೆಕೆಂಡುಗಳಿಗಿಂತ ಕಡಿಮೆ ಅವಧಿಯ ಪ್ರಶ್ನೆ ಕೇಳಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    unsupportedBrowser: 'ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಧ್ವನಿ ಗುರುತಿಸುವಿಕೆ ಲಭ್ಯವಿಲ್ಲ. Chrome ಬಳಸಿ ಅಥವಾ ಟೈಪ್ ಮಾಡಿ.',
    network: 'ಬ್ರೌಸರ್ ಮಾತು ಸೇವೆಗೆ ಸಂಪರ್ಕಿಸಲಾಗಲಿಲ್ಲ. ಸಂಪರ್ಕ ಪರಿಶೀಲಿಸಿ ಅಥವಾ ಟೈಪ್ ಮಾಡಿ.',
  },
  ml: {
    permission: 'മൈക്രോഫോൺ അനുമതി ലഭിച്ചില്ല. ബ്രൗസർ ക്രമീകരണങ്ങളിൽ അനുമതി നൽകി വീണ്ടും ശ്രമിക്കുക.',
    noSpeech: 'ശബ്ദം കണ്ടെത്തിയില്ല. മൈക്രോഫോൺ പരിശോധിച്ച് വീണ്ടും ശ്രമിക്കുക.',
    unsupportedLanguage: 'ഈ ബ്രൗസറിൽ ഈ ഭാഷയ്ക്കുള്ള ശബ്ദ തിരിച്ചറിയൽ ലഭ്യമല്ല.',
    noMic: 'മൈക്രോഫോൺ കണ്ടെത്തിയില്ല. ബന്ധിപ്പിക്കുക അല്ലെങ്കിൽ സന്ദേശം ടൈപ്പ് ചെയ്യുക.',
    serviceFallback: 'ബ്രൗസർ ശബ്ദ സേവനം ലഭ്യമല്ല. സുരക്ഷിതമായ സെർവർ ട്രാൻസ്ക്രിപ്ഷൻ ശ്രമിക്കുന്നു...',
    serviceUnavailable: 'ബ്രൗസർ ശബ്ദ സേവനവും സെർവർ ട്രാൻസ്ക്രിപ്ഷനും ലഭ്യമല്ല. പിന്നീട് ശ്രമിക്കുക അല്ലെങ്കിൽ ടൈപ്പ് ചെയ്യുക.',
    transcriptionFailed: 'സെർവർ ട്രാൻസ്ക്രിപ്ഷൻ പരാജയപ്പെട്ടു. കണക്ഷൻ പരിശോധിച്ച് വീണ്ടും ശ്രമിക്കുക അല്ലെങ്കിൽ ടൈപ്പ് ചെയ്യുക.',
    noTranscript: 'സംസാരം ടെക്സ്റ്റാക്കാനായില്ല. വീണ്ടും ശ്രമിക്കുക അല്ലെങ്കിൽ ടൈപ്പ് ചെയ്യുക.',
    audioTooLarge: 'റെക്കോർഡിംഗ് ദൈർഘ്യമേറിയതാണ്. 45 സെക്കൻഡിൽ താഴെയുള്ള ചോദ്യം വീണ്ടും പറയുക.',
    unsupportedBrowser: 'ഈ ബ്രൗസറിൽ ശബ്ദ തിരിച്ചറിയൽ ലഭ്യമല്ല. Chrome ഉപയോഗിക്കുക അല്ലെങ്കിൽ ടൈപ്പ് ചെയ്യുക.',
    network: 'ബ്രൗസറിന്റെ ശബ്ദ സേവനവുമായി ബന്ധിപ്പിക്കാനായില്ല. കണക്ഷൻ പരിശോധിക്കുക അല്ലെങ്കിൽ ടൈപ്പ് ചെയ്യുക.',
  },
  mr: {
    permission: 'मायक्रोफोनची परवानगी नाकारली. ब्राउझर सेटिंगमध्ये परवानगी देऊन पुन्हा प्रयत्न करा.',
    noSpeech: 'आवाज आढळला नाही. मायक्रोफोन तपासा आणि पुन्हा प्रयत्न करा.',
    unsupportedLanguage: 'या ब्राउझरमध्ये या भाषेतील वाक् ओळख उपलब्ध नाही.',
    noMic: 'मायक्रोफोन आढळला नाही. तो जोडा किंवा संदेश टाइप करा.',
    serviceFallback: 'ब्राउझरची वाक् सेवा उपलब्ध नाही. सुरक्षित सर्व्हर ट्रान्सक्रिप्शनचा प्रयत्न करत आहे...',
    serviceUnavailable: 'ब्राउझरची वाक् सेवा आणि सर्व्हर ट्रान्सक्रिप्शन उपलब्ध नाही. नंतर प्रयत्न करा किंवा संदेश टाइप करा.',
    transcriptionFailed: 'सर्व्हर ट्रान्सक्रिप्शन अयशस्वी. कनेक्शन तपासा आणि पुन्हा प्रयत्न करा किंवा संदेश टाइप करा.',
    noTranscript: 'आवाजाचे मजकुरात रूपांतर झाले नाही. पुन्हा प्रयत्न करा किंवा टाइप करा.',
    audioTooLarge: 'रेकॉर्डिंग खूप मोठे आहे. 45 सेकंदांपेक्षा कमी प्रश्न बोलून पुन्हा प्रयत्न करा.',
    unsupportedBrowser: 'या ब्राउझरमध्ये आवाज ओळख उपलब्ध नाही. Chrome वापरा किंवा संदेश टाइप करा.',
    network: 'ब्राउझरच्या वाक् सेवेशी जोडता आले नाही. कनेक्शन तपासा किंवा संदेश टाइप करा.',
  },
};

export const AiAssistantSidebar: React.FC = () => {
  const { 
    currentUser, 
    language, 
    setLanguage,
    bookings, 
    centres, 
    marketplaceListings, 
    isAiAssistantOpen: isOpen,
    openAiAssistant,
    closeAiAssistant,
    tD
  } = useApp();

  const [activeLang, setActiveLang] = useState<LanguageCode>(language);
  const activeLangRef = useRef(activeLang);
  activeLangRef.current = activeLang;
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Voice Assistance states
  const [isListening, setIsListening] = useState(false);
  const [isRequestingMic, setIsRequestingMic] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isVoiceMuted, setIsVoiceMuted] = useState<boolean>(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [isFallbackRecorder, setIsFallbackRecorder] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [geminiVoiceActive, setGeminiVoiceActive] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recognitionSessionRef = useRef<VoiceRecognitionSession | null>(null);
  const transcriptionAbortRef = useRef<AbortController | null>(null);
  const permissionRequestRef = useRef(0);
  const micStartInProgressRef = useRef(false);
  const micPermissionPendingRef = useRef(false);
  const permissionStreamRef = useRef<MediaStream | null>(null);
  const voiceSubmitTimeoutRef = useRef<number | null>(null);
  const recordingTimeoutRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const speechQueueRef = useRef<{ chunks: string[]; currentIndex: number; langCode: LanguageCode; messageId: string } | null>(null);

  // Sync activeLang if global app language changes
  useEffect(() => {
    if (language !== activeLang) stopSpeaking();
    setActiveLang(language);
    setMicError(null);
  }, [language]);

  // Load and cache available voices from browser
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        setAvailableVoices(voices);
      }
    };

    updateVoices();
    window.speechSynthesis.addEventListener('voiceschanged', updateVoices);

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.removeEventListener('voiceschanged', updateVoices);
      }
    };
  }, []);

  // Initial welcome message tailored to language and user
  const getInitialMessages = (lang: LanguageCode): Message[] => {
    const userName = currentUser?.name ? currentUser.name : '';
    let welcome = '';

    switch (lang) {
      case 'ta':
        welcome = `வணக்கம் ${userName ? userName + ' அவர்களே' : ''}! நான் உங்கள் **AgriBridge AI ஜெமினி குரல் மற்றும் கொள்முதல் உதவியாளர்**.\n\n🎙️ **ஜெமினி குரல் (Gemini Voice)** மற்றும் தமிழ் மைக்ரோஃபோன் வசதி இயங்குகிறது! அரசு MSP விலைகள் (நெல் ₹2,320, கோதுமை ₹2,275), உங்கள் நேரலை டோக்கன் நிலை, மண்டி செயல்பாடுகள் அல்லது DBT பணம் பற்றிய எந்த கேள்வியையும் மைக்ரோஃபோன் வழியாகத் தமிழில் கேட்கலாம். நான் நேரடித் தமிழிலும் ஜெமினி குரல் வழியாகவும் பதிலளிப்பேன்!`;
        break;
      case 'hi':
        welcome = `नमस्ते ${userName}! मैं आपका **एग्रीब्रिज एआई जेमिनी वॉयस व खरीद सहायक** हूँ।\n\n🎙️ **जेमिनी वॉयस (Gemini Voice)** और हिन्दी माइक सक्रिय है! न्यूनतम समर्थन मूल्य (MSP दरें), लाइव टोकन कतार, मंडी स्लॉट बुकिंग या बैंक डीबीटी के बारे में पूछने के लिए माइक दबाएं। मैं हिन्दी टेक्स्ट और जेमिनी वॉयस दोनों में उत्तर दूंगा!`;
        break;
      case 'te':
        welcome = `నమస్కారం ${userName}! నేను మీ **అగ్రిబ్రిడ్జ్ AI జెమిని వాయిస్ & సేకరణ సహాయకుడిని**.\n\n🎙️ **జెమిని వాయిస్ (Gemini Voice)** మరియు తెలుగు మైక్ సిద్ధంగా ఉంది! ప్రభుత్వ MSP మద్దతు ధరలు, మీ లైవ్ టోకెన్, మండి క్యూ లేదా DBT చెల్లింపు గురించి మైక్ ద్వారా తెలుగులో అడగండి. నేను టెక్స్ట్ మరియు జెమిని వాయిస్ రెండింటిలోనూ సమాధానం ఇస్తాను!`;
        break;
      case 'kn':
        welcome = `ನಮಸ್ಕಾರ ${userName}! ನಾನು ನಿಮ್ಮ **ಅಗ್ರಿಬ್ರಿಡ್ಜ್ AI ಜೆಮಿನಿ ಧ್ವನಿ ಮತ್ತು ಖರೀದಿ ಸಹಾಯಕ**.\n\n🎙️ **ಜೆಮಿನಿ ವಾಯ್ಸ್ (Gemini Voice)** ಮತ್ತು ಕನ್ನಡ ಮೈಕ್ರೊಫೋನ್ ಸಕ್ರಿಯವಾಗಿದೆ! ಸರ್ಕಾರದ ಕನಿಷ್ಠ ಬೆಂಬಲ ಬೆಲೆ (MSP), ಲೈವ್ ಟೋಕನ್ ಕ್ಯೂ ಮತ್ತು ಡಿಬಿಟಿ ಪಾವತಿಗಳ ಬಗ್ಗೆ ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಿ ಕೇಳಿ. ನಾನು ಪಠ್ಯ ಮತ್ತು ಧ್ವನಿ ಎರಡರಲ್ಲೂ ಉತ್ತರಿಸುತ್ತೇನೆ!`;
        break;
      case 'mr':
        welcome = `नमस्कार ${userName}! मी तुमचा **अ‍ॅग्रीब्रिज AI जेमिनी आवाज व खरेदी सहाय्यक** आहे.\n\n🎙️ **जेमिनी व्हॉइस (Gemini Voice)** आणि मराठी माइक सक्रिय आहे! शासकीय हमीभाव (MSP), थेट टोकन व रांग स्थिती, किंवा बँक खात्यात थेट DBT बद्दल विचारण्यासाठी माइक दाबा. मी मराठी मजकूर आणि जेमिनी आवाजात उत्तर देईन!`;
        break;
      case 'ml':
        welcome = `നമസ്കാരം ${userName}! ഞാൻ നിങ്ങളുടെ **അഗ്രിബ്രിഡ്ജ് AI ജെമിനി വോയ്സ് അസിസ്റ്റന്റാണ്**.\n\n🎙️ ഔദ്യോഗിക സർക്കാർ MSP നിരക്കുകൾ, തത്സമയ ടോക്കൺ വിവരങ്ങൾ, മണ്ടി ക്യൂ എന്നിവയെക്കുറിച്ച് അറിയാൻ മൈക്ക് ബട്ടൺ ഉപയോഗിക്കുക. ഞാൻ വാചകത്തിലും ശബ്ദത്തിലും മറുപടി നൽകും!`;
        break;
      case 'en':
      default:
        welcome = `Hello ${userName}! I am your **AgriBridge Multilingual AI Voice Assistant** powered by **Gemini Voice**.\n\n🎙️ You can ask questions **by voice or text** in Tamil, Hindi, Telugu, Kannada, Marathi, or English! I will answer with **both text and spoken Gemini voice** in your selected language. Tap the microphone to speak!`;
        break;
    }

    return [
      {
        id: 'msg-welcome',
        sender: 'assistant',
        text: welcome,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        language: lang,
        source: 'gemini-3.8-flash'
      }
    ];
  };

  const [messages, setMessages] = useState<Message[]>(() => getInitialMessages(language));

  // Update initial message when language changes if no interaction has taken place
  useEffect(() => {
    if (messages.length === 1 && messages[0].id === 'msg-welcome') {
      setMessages(getInitialMessages(activeLang));
    }
  }, [activeLang, currentUser]);

  // Handle switching language inside the assistant
  const handleLanguageChange = (code: LanguageCode) => {
    stopSpeaking();
    stopListening();
    setMicError(null);
    setActiveLang(code);
    setLanguage(code); // synchronize with whole app for seamless consistency
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading, interimTranscript]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 250);
    } else {
      stopSpeaking();
      stopListening();
    }
  }, [isOpen]);

  // Clean up speech synthesis & recognition on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      stopListening();
    };
  }, []);

  // Find voice configuration for currently active language
  const activeVoiceConfig = VOICE_LANGUAGES.find(l => l.code === activeLang) || VOICE_LANGUAGES[0];
  const assistantLanguageText = (key: string) =>
    tD(key).replace('{language}', activeVoiceConfig.native);
  const readyPrompt = assistantLanguageText('assistantReadyPrompt')
    .replace('{locale}', activeVoiceConfig.bcp47);

  const loadAvailableVoices = (): Promise<SpeechSynthesisVoice[]> => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return Promise.resolve([]);
    }

    const synthesis = window.speechSynthesis;
    const existingVoices = synthesis.getVoices();
    if (existingVoices.length > 0) {
      setAvailableVoices(existingVoices);
      return Promise.resolve(existingVoices);
    }

    return new Promise(resolve => {
      const finish = () => {
        window.clearTimeout(timeoutId);
        synthesis.removeEventListener('voiceschanged', handleVoicesChanged);
        const loadedVoices = synthesis.getVoices();
        if (loadedVoices.length > 0) setAvailableVoices(loadedVoices);
        resolve(loadedVoices);
      };
      const handleVoicesChanged = () => {
        if (synthesis.getVoices().length > 0) finish();
      };
      const timeoutId = window.setTimeout(finish, 1200);

      synthesis.addEventListener('voiceschanged', handleVoicesChanged);
    });
  };

  const findNativeVoice = (
    voices: SpeechSynthesisVoice[],
    langConfig: LanguageVoiceConfig
  ): SpeechSynthesisVoice | undefined => {
    const languageCode = langConfig.code.toLowerCase();
    const matchingLanguageVoices = voices.filter(voice =>
      (voice.lang || '').toLowerCase().replace(/_/g, '-').split('-')[0] === languageCode
    );
    return matchingLanguageVoices.find(voice =>
      (voice.lang || '').toLowerCase().replace(/_/g, '-') === langConfig.bcp47.toLowerCase()
    ) || matchingLanguageVoices[0] || voices.find(voice => {
      const name = (voice.name || '').toLowerCase();
      return langConfig.speechSynthesisCodes.some(code =>
        name.includes(code.toLowerCase())
      );
    });
  };

  // Stop all active audio playback (both Web Speech and HTML Audio)
  const stopSpeaking = () => {
    speechQueueRef.current = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (audioElementRef.current) {
      try {
        audioElementRef.current.pause();
        audioElementRef.current.currentTime = 0;
      } catch (e) {
        // ignore
      }
      audioElementRef.current = null;
    }
    setSpeakingMessageId(null);
    setGeminiVoiceActive(false);
  };

  // Play audio directly from Gemini Voice base64 data
  const playGeminiAudio = (
    base64Audio: string,
    messageId: string,
    mimeType: string = 'audio/wav',
    fallback?: { text: string; langCode: LanguageCode }
  ) => {
    stopSpeaking();
    try {
      const audio = new Audio(`data:${mimeType};base64,${base64Audio}`);
      audioElementRef.current = audio;
      setSpeakingMessageId(messageId);
      setGeminiVoiceActive(true);

      audio.onended = () => {
        setSpeakingMessageId(null);
        setGeminiVoiceActive(false);
        audioElementRef.current = null;
      };

      audio.onerror = (e) => {
        console.warn('Gemini audio playback error:', e);
        setSpeakingMessageId(null);
        setGeminiVoiceActive(false);
        audioElementRef.current = null;
        if (fallback) {
          const langConfig = VOICE_LANGUAGES.find(l => l.code === fallback.langCode) || VOICE_LANGUAGES[0];
          void loadAvailableVoices().then(voices => {
            const voice = findNativeVoice(voices, langConfig);
            if (voice) {
              playClientSpeechSynthesis(fallback.text, messageId, langConfig, voice);
            } else {
              setMicError(`Could not play the generated audio, and no ${langConfig.label} (${langConfig.bcp47}) voice is available in this browser.`);
            }
          });
        } else {
          setMicError('The generated audio could not be decoded. Please try replaying the response.');
        }
      };

      audio.play().catch(playErr => {
        console.warn('Audio play was prevented by browser autoplay policy:', playErr);
        setSpeakingMessageId(null);
        setGeminiVoiceActive(false);
        setMicError('Audio playback was blocked by the browser. Tap Play Voice to replay this response.');
      });
    } catch (err) {
      console.warn('Failed to initialize Audio element:', err);
      setSpeakingMessageId(null);
      setGeminiVoiceActive(false);
      setMicError('Audio playback is not supported in this browser.');
    }
  };

  // Speak text in the message language, preferring server-generated Gemini audio.
  const speakMessage = async (text: string, messageId: string, langCode: LanguageCode = activeLang) => {
    if (isVoiceMuted) return;

    // If currently speaking this message, toggle off
    if (speakingMessageId === messageId) {
      stopSpeaking();
      return;
    }

    stopListening();
    stopSpeaking();
    setMicError(null);

    // Check if message has pre-attached audioBase64
    const targetMsg = messages.find(m => m.id === messageId);
    if (targetMsg?.audioBase64) {
      playGeminiAudio(targetMsg.audioBase64, messageId, targetMsg.mimeType || 'audio/wav', {
        text,
        langCode,
      });
      return;
    }

    const cleanText = cleanMarkdownForSpeech(text);
    if (!cleanText) {
      setMicError('There is no response text available to speak.');
      return;
    }

    const langConfig = VOICE_LANGUAGES.find(l => l.code === langCode) || activeVoiceConfig;
    let ttsFailure = false;

    setSpeakingMessageId(messageId);
    setGeminiVoiceActive(true);

    try {
      const res = await fetch('/api/assistant/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText, language: langCode }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          // Cache audio onto message for instant re-play
          setMessages(prev => prev.map(m => m.id === messageId ? { ...m, audioBase64: data.audioBase64, mimeType: data.mimeType } : m));
          playGeminiAudio(data.audioBase64, messageId, data.mimeType || 'audio/wav', {
            text: cleanText,
            langCode,
          });
          return;
        }
        ttsFailure = true;
      } else {
        ttsFailure = true;
        console.warn(`Gemini TTS request failed (${res.status}) for language ${langCode}`);
      }
    } catch (ttsErr) {
      console.warn('Gemini Voice server request issue:', ttsErr);
      ttsFailure = true;
    }

    const hasSpeechSynthesis = typeof window !== 'undefined' && 'speechSynthesis' in window;
    if (hasSpeechSynthesis) {
      const voices = availableVoices.length > 0 ? availableVoices : await loadAvailableVoices();
      const matchedVoice = findNativeVoice(voices, langConfig);
      if (matchedVoice || langCode === 'en') {
        playClientSpeechSynthesis(cleanText, messageId, langConfig, matchedVoice);
        return;
      }
    }

    setSpeakingMessageId(null);
    setGeminiVoiceActive(false);
    setMicError(ttsFailure
      ? `Gemini speech could not be generated, and no ${langConfig.label} (${langConfig.bcp47}) voice is available in this browser. Text chat is still available.`
      : `No ${langConfig.label} (${langConfig.bcp47}) voice is available in this browser.`);
  };

  // Helper: Chunked client SpeechSynthesis fallback ONLY when native voice exists
  const playClientSpeechSynthesis = (
    text: string, 
    messageId: string, 
    langConfig: LanguageVoiceConfig, 
    voice?: SpeechSynthesisVoice
  ) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();

    const chunks = splitIntoSentenceChunks(text);
    speechQueueRef.current = {
      chunks,
      currentIndex: 0,
      langCode: langConfig.code,
      messageId
    };

    setSpeakingMessageId(messageId);

    const speakNextChunk = () => {
      const queue = speechQueueRef.current;
      if (!queue || queue.messageId !== messageId || queue.currentIndex >= queue.chunks.length) {
        setSpeakingMessageId(null);
        speechQueueRef.current = null;
        return;
      }

      const chunkText = queue.chunks[queue.currentIndex];
      queue.currentIndex += 1;

      const utterance = new SpeechSynthesisUtterance(chunkText);
      utterance.lang = langConfig.bcp47;
      utterance.rate = 0.94;
      utterance.pitch = 1.0;

      if (voice) {
        utterance.voice = voice;
      }

      utterance.onend = () => {
        speakNextChunk();
      };

      utterance.onerror = (e) => {
        console.warn('Utterance chunk error:', e);
        speechQueueRef.current = null;
        window.speechSynthesis.cancel();
        setSpeakingMessageId(null);
        setMicError(`The ${langConfig.label} browser voice could not speak this response.`);
      };

      (window as any).__currentAiUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    };

    speakNextChunk();
  };

  const voiceInputMessage = (langCode: LanguageCode, message: string) =>
    VOICE_INPUT_MESSAGES[langCode]?.[message] || VOICE_INPUT_MESSAGES.en[message];

  const releasePermissionStream = (stream?: MediaStream) => {
    const activeStream = stream || permissionStreamRef.current;
    activeStream?.getTracks().forEach(track => track.stop());
    if (!stream || permissionStreamRef.current === stream) {
      permissionStreamRef.current = null;
    }
  };

  const stopSessionRecording = (session: VoiceRecognitionSession, discard = false): Promise<Blob | null> => {
    const recorder = session.audioRecorder;
    if (!recorder) {
      releasePermissionStream(session.audioStream);
      return Promise.resolve(null);
    }

    if (discard) {
      recorder.ondataavailable = null;
      recorder.onerror = null;
      recorder.onstop = null;
      if (recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch (error) {
          console.warn('Could not discard recorded voice input:', error);
        }
      }
      session.audioChunks = [];
      releasePermissionStream(session.audioStream);
      return Promise.resolve(null);
    }

    if (session.recordingStopPromise) return session.recordingStopPromise;

    session.recordingStopPromise = new Promise(resolve => {
      const finish = () => {
        const audio = session.audioChunks.length
          ? new Blob(session.audioChunks, { type: session.audioMimeType })
          : null;
        session.audioChunks = [];
        releasePermissionStream(session.audioStream);
        resolve(audio && audio.size > 0 ? audio : null);
      };

      if (recorder.state === 'inactive') {
        finish();
        return;
      }
      recorder.addEventListener('stop', finish, { once: true });
      try {
        recorder.stop();
      } catch (error) {
        console.warn('Could not finish audio recording:', error);
        finish();
      }
    });

    return session.recordingStopPromise;
  };

  // Cancel an active capture without submitting its partial transcript.
  const stopListening = () => {
    permissionRequestRef.current += 1;
    if (!micPermissionPendingRef.current) micStartInProgressRef.current = false;
    if (voiceSubmitTimeoutRef.current !== null) {
      window.clearTimeout(voiceSubmitTimeoutRef.current);
      voiceSubmitTimeoutRef.current = null;
    }
    if (recordingTimeoutRef.current !== null) {
      window.clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    if (!micPermissionPendingRef.current) setIsRequestingMic(false);

    const session = recognitionSessionRef.current;
    if (session) {
      session.cancelled = true;
      setInputText(session.originalInput);
      void stopSessionRecording(session, true);
    }

    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    recognitionSessionRef.current = null;
    if (recognition) {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.abort();
      } catch (error) {
        console.warn('Could not stop speech recognition:', error);
      }
    }

    transcriptionAbortRef.current?.abort();
    transcriptionAbortRef.current = null;
    setIsTranscribing(false);
    setIsListening(false);
    setIsFallbackRecorder(false);
    setInterimTranscript('');
  };

  const transcribeRecording = async (session: VoiceRecognitionSession) => {
    if (session.submitted || session.cancelled) return;
    session.submitted = true;
    setIsListening(false);
    setIsTranscribing(true);
    setMicError(null);

    try {
      const audio = await stopSessionRecording(session);
      if (session.cancelled) return;
      setIsFallbackRecorder(false);
      if (!audio) {
        setInputText(session.originalInput);
        setMicError(voiceInputMessage(session.language, 'noTranscript'));
        return;
      }
      if (audio.size > 3_500_000) {
        setInputText(session.originalInput);
        setMicError(voiceInputMessage(session.language, 'audioTooLarge'));
        return;
      }

      const bytes = new Uint8Array(await audio.arrayBuffer());
      let binary = '';
      const chunkSize = 0x8000;
      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
      }

      const controller = new AbortController();
      transcriptionAbortRef.current = controller;
      const response = await fetch('/api/assistant/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: btoa(binary),
          mimeType: audio.type || session.audioMimeType || 'audio/webm',
          language: session.language,
        }),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({}));
      if (session.cancelled) return;
      if (!response.ok) {
        setInputText(session.originalInput);
        setMicError(response.status === 503 || response.status === 502
          ? voiceInputMessage(session.language, 'serviceUnavailable')
          : response.status === 413
          ? voiceInputMessage(session.language, 'audioTooLarge')
          : response.status === 422
          ? voiceInputMessage(session.language, 'noTranscript')
          : voiceInputMessage(session.language, 'transcriptionFailed'));
        return;
      }

      const transcript = typeof data.transcript === 'string' ? data.transcript.trim() : '';
      if (!transcript) {
        setInputText(session.originalInput);
        setMicError(voiceInputMessage(session.language, 'noTranscript'));
        return;
      }

      setInputText(transcript);
      if (recognitionSessionRef.current === session) recognitionSessionRef.current = null;
      voiceSubmitTimeoutRef.current = window.setTimeout(() => {
        voiceSubmitTimeoutRef.current = null;
        setIsTranscribing(false);
        if (!session.cancelled) void handleSendMessage(transcript, true, session.language);
      }, 250);
    } catch (error) {
      if (!session.cancelled) {
        console.error('Server-side speech transcription failed:', error);
        setInputText(session.originalInput);
        setMicError(voiceInputMessage(session.language, 'transcriptionFailed'));
      }
    } finally {
      if (transcriptionAbortRef.current?.signal.aborted || !session.cancelled) {
        transcriptionAbortRef.current = null;
      }
      if (!voiceSubmitTimeoutRef.current) setIsTranscribing(false);
      if (recognitionSessionRef.current === session && !voiceSubmitTimeoutRef.current) {
        recognitionSessionRef.current = null;
      }
    }
  };

  // Stop recording and submit any transcript captured so far.
  const finishListening = () => {
    if (recordingTimeoutRef.current !== null) {
      window.clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }

    const recognition = recognitionRef.current;
    if (!recognition) {
      const session = recognitionSessionRef.current;
      if (session) {
        setIsFallbackRecorder(false);
        void transcribeRecording(session);
      }
      return;
    }
    try {
      recognition.stop();
    } catch (error) {
      console.warn('Could not finish speech recognition:', error);
      setMicError('Could not stop listening. Please try the microphone again.');
    }
  };

  // SpeechRecognition must be started by a user gesture. The explicit getUserMedia
  // request surfaces browser permission and missing-device errors before capture.
  const startListening = async (forcedLang?: LanguageCode) => {
    if (isLoading || isTranscribing || speakingMessageId || isListening || isRequestingMic || micStartInProgressRef.current || recognitionSessionRef.current) return;

    setMicError(null);
    stopSpeaking();

    const targetLangCode = forcedLang || activeLang;
    if (forcedLang && forcedLang !== activeLang) {
      setActiveLang(forcedLang);
      setLanguage(forcedLang);
    }

    const currentConfig = VOICE_LANGUAGES.find(l => l.code === targetLangCode) || activeVoiceConfig;
    const browserWindow = window as Window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRecognition = browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
    const supportsMediaRecorder = typeof window.MediaRecorder !== 'undefined';

    if (!SpeechRecognition && !supportsMediaRecorder) {
      setMicError(voiceInputMessage(targetLangCode, 'unsupportedBrowser'));
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicError('Microphone access is unavailable. Use a secure connection (HTTPS or localhost) and continue by typing.');
      return;
    }

    const requestId = ++permissionRequestRef.current;
    micStartInProgressRef.current = true;
    micPermissionPendingRef.current = true;
    setIsRequestingMic(true);
    setInterimTranscript('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micPermissionPendingRef.current = false;
      if (requestId !== permissionRequestRef.current) {
        stream.getTracks().forEach(track => track.stop());
        micStartInProgressRef.current = false;
        setIsRequestingMic(false);
        return;
      }

      permissionStreamRef.current = stream;
      const session: VoiceRecognitionSession = {
        cancelled: false,
        submitted: false,
        transcript: '',
        originalInput: inputText,
        language: targetLangCode,
        audioChunks: [],
        audioMimeType: '',
        audioRecorder: null,
        audioStream: stream,
      };
      recognitionSessionRef.current = session;

      if (supportsMediaRecorder) {
        const preferredMimeTypes = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/mp4',
          'audio/ogg;codecs=opus',
        ];
        const supportedMimeType = preferredMimeTypes.find(type => MediaRecorder.isTypeSupported(type));

        try {
          const recorder = supportedMimeType
            ? new MediaRecorder(stream, { mimeType: supportedMimeType })
            : new MediaRecorder(stream);
          session.audioRecorder = recorder;
          session.audioMimeType = recorder.mimeType || supportedMimeType || 'audio/webm';
          recorder.ondataavailable = event => {
            if (event.data.size > 0 && !session.cancelled) {
              session.audioChunks.push(event.data);
            }
          };
          recorder.onerror = event => {
            console.warn('Voice fallback recording error:', event);
            session.error = 'recording-error';
          };
          recorder.start(250);
        } catch (error) {
          console.warn('Could not initialize voice fallback recorder:', error);
          session.audioRecorder = null;
          if (!SpeechRecognition) throw error;
        }
      }

      if (!SpeechRecognition) {
        micStartInProgressRef.current = false;
        setIsRequestingMic(false);
        setIsListening(true);
        setIsFallbackRecorder(true);
        recordingTimeoutRef.current = window.setTimeout(finishListening, 45_000);
        return;
      }

      if (!session.audioRecorder) releasePermissionStream(stream);

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = currentConfig.bcp47;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        if (session.cancelled || recognitionSessionRef.current !== session) return;
        micStartInProgressRef.current = false;
        setIsRequestingMic(false);
        setIsListening(true);
        setIsFallbackRecorder(false);
        setInterimTranscript('');
        if (session.audioRecorder) {
          recordingTimeoutRef.current = window.setTimeout(finishListening, 45_000);
        }
      };

      recognition.onresult = event => {
        if (session.cancelled || recognitionSessionRef.current !== session) return;
        let finalTranscript = '';
        let partialTranscript = '';

        for (let index = 0; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcript = result?.[0]?.transcript || '';
          if (result?.isFinal) {
            finalTranscript += `${transcript} `;
          } else {
            partialTranscript += `${transcript} `;
          }
        }

        session.transcript = finalTranscript.trim();
        const preview = [session.transcript, partialTranscript.trim()].filter(Boolean).join(' ');
        setInputText(preview);
        setInterimTranscript(partialTranscript.trim());
      };

      recognition.onerror = event => {
        if (session.cancelled || recognitionSessionRef.current !== session) return;
        console.warn('Speech recognition error event:', event);
        session.error = event.error || 'unknown';
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setMicError(voiceInputMessage(targetLangCode, 'permission'));
        } else if (event.error === 'no-speech') {
          setMicError(voiceInputMessage(targetLangCode, 'noSpeech'));
        } else if (event.error === 'language-not-supported') {
          if (session.audioRecorder) {
            setMicError(voiceInputMessage(targetLangCode, 'serviceFallback'));
          } else {
            setMicError(voiceInputMessage(targetLangCode, 'unsupportedLanguage'));
          }
        } else if (event.error === 'audio-capture') {
          setMicError(voiceInputMessage(targetLangCode, 'noMic'));
        } else if (event.error === 'network') {
          setMicError(session.audioRecorder
            ? voiceInputMessage(targetLangCode, 'serviceFallback')
            : voiceInputMessage(targetLangCode, 'network'));
        } else {
          setMicError(`Speech recognition failed (${session.error}). Please try again or type your message.`);
        }
      };

      recognition.onend = () => {
        if (recognitionSessionRef.current !== session) return;
        if (recordingTimeoutRef.current !== null) {
          window.clearTimeout(recordingTimeoutRef.current);
          recordingTimeoutRef.current = null;
        }
        if (recognitionRef.current === recognition) recognitionRef.current = null;
        setIsListening(false);
        setIsRequestingMic(false);
        setIsFallbackRecorder(false);
        setInterimTranscript('');

        const spoken = session.transcript.trim();
        if (session.cancelled || session.submitted) return;
        if (!spoken) {
          if (session.error === 'network' || session.error === 'language-not-supported') {
            if (session.audioRecorder) {
              void transcribeRecording(session);
              return;
            }
            setMicError(session.error === 'network'
                ? voiceInputMessage(session.language, 'network')
              : voiceInputMessage(session.language, 'unsupportedLanguage'));
          } else if (session.error === 'no-speech') {
            setMicError(voiceInputMessage(session.language, 'noSpeech'));
          } else if (!session.error) {
            setMicError(voiceInputMessage(session.language, 'noTranscript'));
          }
          void stopSessionRecording(session, true);
          recognitionSessionRef.current = null;
          setInputText(session.originalInput);
          return;
        }

        // Keep the recognized words visible in the input before handing them to the
        // existing AI endpoint. Mark first so duplicate end events cannot resubmit.
        session.submitted = true;
        setInputText(spoken);
        void stopSessionRecording(session, true);
        recognitionSessionRef.current = null;
        setIsTranscribing(true);
        voiceSubmitTimeoutRef.current = window.setTimeout(() => {
          voiceSubmitTimeoutRef.current = null;
          setIsTranscribing(false);
          if (session.cancelled) return;
          void handleSendMessage(spoken, true, session.language);
        }, 250);
      };

      recognition.start();
    } catch (error) {
      micPermissionPendingRef.current = false;
      micStartInProgressRef.current = false;
      if (requestId !== permissionRequestRef.current) {
        setIsRequestingMic(false);
        return;
      }
      const session = recognitionSessionRef.current;
      if (session) {
        session.cancelled = true;
        void stopSessionRecording(session, true);
        recognitionSessionRef.current = null;
      } else {
        releasePermissionStream();
      }
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      if (recognition) {
        recognition.onstart = null;
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        try {
          recognition.abort();
        } catch (abortError) {
          console.warn('Could not abort failed speech recognition startup:', abortError);
        }
      }
      setIsRequestingMic(false);
      setIsListening(false);
      setIsFallbackRecorder(false);

      const permissionError = error as DOMException;
      if (permissionError?.name === 'NotAllowedError' || permissionError?.name === 'PermissionDeniedError') {
        setMicError(voiceInputMessage(targetLangCode, 'permission'));
      } else if (permissionError?.name === 'NotFoundError' || permissionError?.name === 'DevicesNotFoundError') {
        setMicError(voiceInputMessage(targetLangCode, 'noMic'));
      } else if (permissionError?.name === 'NotReadableError' || permissionError?.name === 'TrackStartError') {
        setMicError('The microphone is unavailable or being used by another app. Close other apps using it and try again.');
      } else {
        console.error('Failed to start speech recognition:', error);
        setMicError(voiceInputMessage(targetLangCode, 'transcriptionFailed'));
      }
    } finally {
      if (requestId === permissionRequestRef.current) micStartInProgressRef.current = false;
    }
  };

  const handleSendMessage = async (
    textToSend?: string,
    wasVoiceQuery: boolean = false,
    requestedLanguage?: LanguageCode
  ) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const responseLanguage = requestedLanguage || activeLang;
    stopSpeaking();
    stopListening();

    const userMessage: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      wasSpoken: wasVoiceQuery
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setInterimTranscript('');
    setIsLoading(true);

    try {
      const historyPayload = messages.slice(-6).map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text,
      }));

      const contextPayload = {
        currentUser: currentUser ? {
          name: currentUser.name,
          role: currentUser.role,
          location: currentUser.location,
          aadhaarLinked: currentUser.aadhaarLinked,
          bankAccountLinked: currentUser.bankAccountLinked,
        } : null,
        activeBookings: bookings.map(b => ({
          tokenNumber: b.tokenNumber,
          crop: b.crop,
          quantityQuintals: b.quantityQuintals,
          centreName: b.centreName,
          status: b.status,
          bookingDate: b.bookingDate,
        })),
        centres: centres.map(c => ({
          name: c.name,
          district: c.district,
          operatingStatus: c.operatingStatus,
          currentQueueLength: c.currentQueueCount,
        })),
        marketplaceSummary: {
          totalListings: marketplaceListings.length,
          topCrops: marketplaceListings.slice(0, 3).map(l => `${l.crop} (₹${l.pricePerQuintal}/q)`),
        }
      };

      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
          context: contextPayload,
          language: responseLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      const botMessageId = `ast-${Date.now()}`;
      const botReplyText = data.reply || 'I processed your request, but received an empty response. Please try asking again.';

      const botReply: Message = {
        id: botMessageId,
        sender: 'assistant',
        text: botReplyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: data.source || 'gemini-3.8-flash',
        language: responseLanguage,
        audioBase64: data.audioBase64 || undefined,
        mimeType: data.mimeType || 'audio/wav',
      };

      setMessages(prev => [...prev, botReply]);

      if (wasVoiceQuery && !isVoiceMuted && responseLanguage === activeLangRef.current) {
        if (data.audioBase64) {
          playGeminiAudio(data.audioBase64, botMessageId, data.mimeType || 'audio/wav', {
            text: botReplyText,
            langCode: responseLanguage,
          });
        } else {
          speakMessage(botReplyText, botMessageId, responseLanguage);
        }
      }
    } catch (err: any) {
      console.error('AI Assistant fetch error:', err);
      let errorMsg = 'I encountered an issue connecting to the AI service. Please try asking again or call the farmer helpline at 1800-180-1551.';
      if (responseLanguage === 'ta') {
        errorMsg = 'மன்னிக்கவும், AI சேவையைத் தொடர்புகொள்வதில் தாமதம் ஏற்பட்டது. தயவுசெய்து மீண்டும் முயற்சிக்கவும் அல்லது உழவர் உதவி மையத்தை (1800-180-1551) அழைக்கவும்.';
      } else if (responseLanguage === 'hi') {
        errorMsg = 'क्षमा करें, AI सेवा से जुड़ने में समस्या हुई। कृपया पुनः प्रयास करें या किसान हेल्पलाइन 1800-180-1551 पर संपर्क करें।';
      } else if (responseLanguage === 'te') {
        errorMsg = 'క్షమించండి, AI సేవను సంప్రదించడంలో సమస్య ఏర్పడింది. దయచేసి మళ్లీ ప్రయత్నించండి లేదా హెల్ప్‌లైన్ 1800-180-1551 ను సంప్రదించండి.';
      } else if (responseLanguage === 'kn') {
        errorMsg = 'ಕ್ಷಮಿಸಿ, AI ಸೇವೆಯನ್ನು ಸಂಪರ್ಕಿಸುವಲ್ಲಿ ತೊಂದರೆಯಾಗಿದೆ. ದಯವಿಟ್ಟು ಪುನಃ ಪ್ರಯತ್ನಿಸಿ ಅಥವಾ ರೈತ ಸಹಾಯವಾಣಿ 1800-180-1551 ಗೆ ಕರೆ ಮಾಡಿ.';
      } else if (responseLanguage === 'mr') {
        errorMsg = 'क्षमस्व, AI सेवेशी संपर्क साधण्यात अडचण आली. कृपया पुन्हा प्रयत्न करा किंवा शेतकरी हेल्पलाइन 1800-180-1551 वर संपर्क साधा.';
      } else if (responseLanguage === 'ml') {
        errorMsg = 'ക്ഷമിക്കണം, എഐ സേവനവുമായി ബന്ധപ്പെടുന്നതിൽ തടസ്സമുണ്ടായി. ദയവായി വീണ്ടും ശ്രമിക്കുക.';
      }

      const errId = `err-${Date.now()}`;
      const errorMessage: Message = {
        id: errId,
        sender: 'assistant',
        text: errorMsg,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        language: responseLanguage,
      };
      setMessages(prev => [...prev, errorMessage]);

      if (wasVoiceQuery && !isVoiceMuted && responseLanguage === activeLangRef.current) {
        speakMessage(errorMsg, errId, responseLanguage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChatHistory = () => {
    stopSpeaking();
    stopListening();
    setMessages(getInitialMessages(activeLang));
  };

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={openAiAssistant}
          className="fixed bottom-5 right-5 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-[#8B5CF6] text-white shadow-lg shadow-violet-950/25 transition duration-200 ease-out hover:scale-105 hover:bg-violet-600 hover:shadow-xl active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300 print:hidden"
          title={tD('assistantOpen')}
          aria-label={tD('assistantOpen')}
          aria-expanded={false}
        >
          <Bot aria-hidden="true" className="h-8 w-8" strokeWidth={2.2} />
        </button>
      )}

      {isOpen && (
        <aside
          role="dialog"
          aria-label={tD('aiAssistant')}
          className="fixed bottom-4 right-4 z-50 flex h-[min(40rem,calc(100dvh-2rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 dark:border-white/10 dark:bg-neutral-900 print:hidden sm:bottom-6 sm:right-6"
        >
          {/* Header Bar */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white flex items-center justify-between border-b border-emerald-950/40 relative">
            {/* Top Tricolor Accent */}
            <div className="absolute top-0 left-0 right-0 h-1 flex">
              <div className="h-full flex-1 bg-amber-500" />
              <div className="h-full flex-1 bg-white" />
              <div className="h-full flex-1 bg-emerald-600" />
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 via-emerald-400 to-teal-300 flex items-center justify-center text-slate-950 shadow-md">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                    <span>{tD('aiAssistant')}</span>
                  </h3>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black tracking-wider bg-amber-400 text-slate-950">
                    {tD('assistantGeminiVoice')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-emerald-200">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{activeVoiceConfig.native}</span>
                  </span>
                  <span>•</span>
                  <span>{tD('assistantLiveStatus')}</span>
                </div>
              </div>
            </div>

            {/* Header Right Action Controls */}
            <div className="flex items-center gap-1 text-slate-200">
              {/* Voice Mute / Unmute Toggle */}
              <button
                onClick={() => {
                  if (!isVoiceMuted) stopSpeaking();
                  setIsVoiceMuted(!isVoiceMuted);
                }}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isVoiceMuted 
                    ? 'bg-red-500/30 text-red-200 hover:bg-red-500/40' 
                    : 'hover:bg-white/10 text-emerald-300 hover:text-white'
                }`}
                title={isVoiceMuted ? tD('assistantUnmuteVoice') : tD('assistantMuteVoice')}
                aria-label={isVoiceMuted ? tD('assistantUnmuteVoice') : tD('assistantMuteVoice')}
              >
                {isVoiceMuted ? <VolumeX className="w-4 h-4 text-red-300" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {/* Clear Chat */}
              <button
                onClick={clearChatHistory}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title={tD('clearChatBtn')}
                aria-label={tD('clearChatBtn')}
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* Close Sidebar */}
              <button
                onClick={() => {
                  stopSpeaking();
                  stopListening();
                  closeAiAssistant();
                }}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer ml-1"
                aria-label={tD('assistantClose')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Multilingual Selector Header Pills: Tamil, Hindi, Telugu, Kannada, Marathi, English */}
          <div className="px-3 py-2 bg-slate-100 dark:bg-neutral-800/80 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 shrink-0 text-slate-600 dark:text-slate-300 text-xs font-semibold">
              <Languages className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[11px]">{tD('assistantLanguageLabel')}</span>
            </div>

            <div className="flex items-center gap-1 shrink-0 overflow-x-auto">
              {VOICE_LANGUAGES.map((l) => {
                const isSelected = activeLang === l.code;
                return (
                  <button
                    key={l.code}
                    onClick={() => handleLanguageChange(l.code)}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400/50'
                        : 'bg-white dark:bg-neutral-700 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-neutral-600 border border-slate-200 dark:border-white/10'
                    }`}
                    title={`${tD('assistantSwitchLanguage')} ${l.native}`}
                  >
                    <span>{l.flag}</span>
                    <span>{l.native}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Voice conversation status and capture controls */}
          <div
            role="status"
            aria-live="polite"
            className="px-3 py-1.5 bg-gradient-to-r from-amber-50 to-emerald-50 dark:from-neutral-800 dark:to-neutral-850 border-b border-amber-200/50 dark:border-white/10 flex items-center justify-between text-xs animate-fadeIn min-h-8"
          >
              {micError ? (
                <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 text-[11px] font-semibold">
                  <Mic className="w-3.5 h-3.5 shrink-0" />
                  <span>{micError}</span>
                </div>
              ) : isRequestingMic ? (
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-semibold text-[11px]">
                  <Mic className="w-3.5 h-3.5 animate-pulse" />
                  <span>{tD('assistantRequestingMic')}</span>
                  <button
                    onClick={stopListening}
                    className="ml-auto text-[10px] bg-slate-600 hover:bg-slate-700 text-white font-bold px-2 py-0.5 rounded cursor-pointer"
                    aria-label={tD('assistantCancel')}
                  >
                    {tD('assistantCancel')}
                  </button>
                </div>
              ) : isListening ? (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-xs">
                    <Mic className="w-3.5 h-3.5 animate-pulse" />
                    <span>{isFallbackRecorder
                      ? assistantLanguageText('assistantRecordingFallback')
                      : activeVoiceConfig.listeningPrompt}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={finishListening}
                      className="text-[10px] bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-2 py-0.5 rounded cursor-pointer"
                      aria-label={tD('assistantStopAndSend')}
                    >
                      {tD('assistantStopAndSend')}
                    </button>
                    <button
                      onClick={stopListening}
                      className="text-[10px] bg-red-600 hover:bg-red-700 text-white font-bold px-2 py-0.5 rounded cursor-pointer"
                      aria-label={tD('assistantCancelVoiceInput')}
                    >
                      {tD('assistantCancel')}
                    </button>
                  </div>
                </div>
              ) : isTranscribing ? (
                <div className="flex items-center justify-between w-full text-amber-700 dark:text-amber-300 font-semibold text-[11px]">
                  <span className="flex items-center gap-2">
                    <AudioWaveform className="w-3.5 h-3.5 animate-pulse" />
                    <span>{assistantLanguageText('assistantTranscribing')}</span>
                  </span>
                  <button
                    onClick={stopListening}
                    className="text-[10px] bg-slate-600 hover:bg-slate-700 text-white font-bold px-2 py-0.5 rounded cursor-pointer"
                    aria-label={tD('assistantCancel')}
                  >
                    {tD('assistantCancel')}
                  </button>
                </div>
              ) : isLoading ? (
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]">
                  <AudioWaveform className="w-3.5 h-3.5 animate-pulse" />
                  <span>{tD('assistantProcessing')}</span>
                </div>
              ) : speakingMessageId ? (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                    <AudioWaveform className="w-3.5 h-3.5 animate-pulse" />
                    <span>{tD('assistantSpeaking')} ({activeVoiceConfig.native})</span>
                  </div>
                  <button
                    onClick={stopSpeaking}
                    className="text-[10px] bg-amber-600 hover:bg-amber-700 text-white font-bold px-2 py-0.5 rounded cursor-pointer flex items-center gap-1"
                  >
                    <VolumeX className="w-3 h-3" />
                    <span>{tD('assistantStopVoice')}</span>
                  </button>
                </div>
              ) : null}
              {!micError && !isRequestingMic && !isListening && !isTranscribing && !isLoading && !speakingMessageId && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-semibold text-[11px]">
                  <Mic className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{readyPrompt}</span>
                </div>
              )}
          </div>

          {/* Messages Scrollable List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/60 dark:bg-neutral-950/60">
            {messages.map((msg) => {
              const isAssistant = msg.sender === 'assistant';
              const isSpeakingThis = speakingMessageId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isAssistant ? 'justify-start' : 'justify-end'}`}
                >
                  {isAssistant && (
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[85%] flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}>
                    <div
                      className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        isAssistant
                          ? 'bg-white dark:bg-neutral-900 border border-slate-200/90 dark:border-white/10 text-slate-800 dark:text-slate-100 rounded-tl-xs shadow-xs'
                          : 'bg-emerald-600 text-white rounded-tr-xs shadow-xs'
                      } ${isSpeakingThis ? 'ring-2 ring-amber-400 bg-amber-50/40 dark:bg-neutral-850' : ''}`}
                    >
                      {/* Spoken voice tag if query was by mic */}
                      {msg.wasSpoken && (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-200 mb-1 font-semibold">
                          <Mic className="w-2.5 h-2.5" />
                          <span>{tD('assistantVoiceQuery')} ({activeVoiceConfig.native})</span>
                        </div>
                      )}

                      {/* Message Content Rendered with Paragraph Spacing */}
                      <div className="whitespace-pre-wrap break-words space-y-2">
                        {msg.text}
                      </div>

                      {/* Assistant Card Footer Controls */}
                      {isAssistant && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-[11px] text-slate-400 gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>{tD('assistantGeminiVoice')}</span>
                            </span>
                            <span>•</span>
                            <span className="text-[10px]">{msg.timestamp}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Read Aloud / Play Voice Button */}
                            <button
                              onClick={() => speakMessage(msg.text, msg.id, msg.language || activeLang)}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                                isSpeakingThis
                                  ? 'bg-amber-600 text-white ring-2 ring-amber-400/50 animate-pulse'
                                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/40'
                              }`}
                              title={isSpeakingThis
                                ? tD('assistantStopVoice')
                                : `${tD('assistantPlayVoice')} ${VOICE_LANGUAGES.find(l => l.code === (msg.language || activeLang))?.native || activeVoiceConfig.native}`}
                            >
                              {isSpeakingThis ? (
                                <>
                                  <VolumeX className="w-3.5 h-3.5 text-amber-200" />
                                  <span className="text-white text-[11px] font-bold">{tD('assistantStop')}</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                  <span className="text-[11px]">{tD('assistantPlayVoice')}</span>
                                </>
                              )}
                            </button>

                            {/* Copy button */}
                            <button
                              onClick={() => copyToClipboard(msg.text, msg.id)}
                              className="flex items-center gap-1 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors p-1"
                              title={tD('assistantCopyResponse')}
                            >
                              {copiedId === msg.id ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {!isAssistant && (
                    <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Live Interim Transcript Bubble while User is Speaking */}
            {isListening && interimTranscript && (
              <div className="flex gap-2.5 justify-end animate-fadeIn">
                <div className="max-w-[85%] bg-emerald-600 text-white p-3 rounded-2xl rounded-tr-xs shadow-md border border-emerald-400">
                  <div className="flex items-center justify-between gap-2 text-[11px] text-amber-200 mb-1 font-bold">
                    <span className="flex items-center gap-1">
                      <Mic className="w-3.5 h-3.5 animate-pulse" />
                      <span>{activeVoiceConfig.listeningPrompt}</span>
                    </span>
                  </div>
                  <p className="text-xs italic bg-emerald-700/60 p-2 rounded-lg">{interimTranscript}...</p>
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-white/10 rounded-2xl px-4 py-3 shadow-2xs">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.4s]" />
                    <span className="font-semibold ml-1 text-xs text-emerald-800 dark:text-emerald-300">
                      {tD('assistantAnswerPreparing')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions Chips for selected language */}
          <div className="p-2.5 bg-white dark:bg-neutral-900 border-t border-slate-100 dark:border-white/10">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <span>{tD('quickQuestionsTitle')}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">({activeVoiceConfig.native})</span>
              </span>
              <span className="text-[10px] text-slate-400">{tD('assistantTapOrSpeak')}</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {activeVoiceConfig.sampleQuestions.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(item.query, false)}
                  disabled={isLoading}
                  className="text-left whitespace-nowrap text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 dark:bg-neutral-800 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-300 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-white/10 transition-colors font-medium shrink-0 disabled:opacity-50 cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input Form Bar with Microphone and Send Controls */}
          <div className="p-3 bg-white dark:bg-neutral-900 border-t border-slate-200 dark:border-white/10">
            {/* Active Voice Service Status Bar */}
            <div className="mb-2 flex items-center justify-between text-[11px] px-1">
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                <AudioWaveform className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span>{tD('assistantVoiceConversation')}</span>
                <span className="bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.2 rounded text-[10px] font-bold">
                  {activeVoiceConfig.native} ({activeVoiceConfig.bcp47})
                </span>
              </div>

              {/* Quick switch language dropdown */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400">{tD('assistantSwitchLanguage')}</span>
                <select
                  value={activeLang}
                  onChange={(e) => handleLanguageChange(e.target.value as LanguageCode)}
                  className="text-[11px] bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-white/10 rounded px-1.5 py-0.5 text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
                >
                  {VOICE_LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.native}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              {/* Text Input */}
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={activeVoiceConfig.placeholder}
                  disabled={isLoading || isListening || isTranscribing}
                  className="w-full pl-3.5 pr-2.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all disabled:opacity-50"
                />
              </div>

              {/* Voice Assistance Microphone Button for all listed languages */}
              <button
                type="button"
                onClick={() => {
                  if (isListening) finishListening();
                  else if (isRequestingMic) stopListening();
                  else void startListening();
                }}
                disabled={isLoading || isTranscribing || !!speakingMessageId}
                title={isListening
                  ? tD('assistantStopAndSend')
                  : isRequestingMic
                    ? tD('assistantCancel')
                    : `${tD('assistantTapPrompt')} ${activeVoiceConfig.native} (${activeVoiceConfig.bcp47})`}
                className={`p-2.5 rounded-xl transition-all shrink-0 cursor-pointer flex items-center justify-center relative ${
                  isListening
                    ? 'bg-red-600 hover:bg-red-700 text-white ring-4 ring-red-400/50 animate-pulse'
                    : isRequestingMic
                    ? 'bg-slate-500 hover:bg-slate-600 text-white shadow-sm'
                    : 'bg-amber-500 hover:bg-amber-600 text-slate-900 shadow-sm'
                }`}
                aria-label={isListening
                  ? tD('assistantStopAndSend')
                  : isRequestingMic
                    ? tD('assistantCancel')
                    : `${tD('assistantVoiceConversation')} ${activeVoiceConfig.native}`}
              >
                {isListening ? (
                  <MicOff className="w-4 h-4 text-white" />
                ) : isRequestingMic ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>

              {/* Text Send Button */}
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading || isTranscribing}
                className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 dark:disabled:bg-neutral-800 text-white disabled:text-slate-400 shadow-sm transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed"
                aria-label={tD('assistantSendMessage')}
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            <p className="mt-1.5 text-[9px] leading-snug text-slate-400 dark:text-slate-500">
              {tD('assistantFallbackNotice')}
            </p>

            {/* Keep the existing quick language shortcut while honoring its selection before capture. */}
            {activeLang !== 'ta' && (
              <div className="mt-2 pt-1 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px]">
                <span className="text-slate-400">{tD('assistantQuickSwitch')}</span>
                <button
                  type="button"
                  onClick={() => {
                    handleLanguageChange('ta');
                    void startListening('ta');
                  }}
                  disabled={isLoading || isTranscribing || !!speakingMessageId || isListening || isRequestingMic}
                  className="text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 font-bold cursor-pointer disabled:opacity-50"
                >
                  <Mic className="w-3 h-3 text-amber-500" />
                  <span>🇮🇳 {tD('assistantSpeakTamil')}</span>
                </button>
              </div>
            )}

            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1">
                <span>{tD('geminiPoweredTag')}</span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  {tD('assistantGeminiVoice')} ({activeVoiceConfig.bcp47})
                </span>
              </span>
              <span>{tD('assistantHelpline')}: 1800-180-1551</span>
            </div>
          </div>
        </aside>
      )}
    </>
  );
};
