// Client-side translation for values that arrive from the weather API and the
// rules engine rather than from the UI catalogue.
//
// The backend contract is English-only (see lib/types/dashboard.ts), and those
// values come from a *closed* vocabulary: WMO condition names, CPCB AQI
// categories, UV bands, comfort labels, packing items and so on are all
// generated from fixed tables in lib/. So a lookup keyed by the English string
// is sufficient — and it degrades safely: anything unrecognised (a station
// name, a government bulletin body, a free-text forecast) is returned
// untouched rather than mangled or blanked.
//
// If the API later grows real multi-language support, `translateDynamic` is the
// single place the frontend needs to stop calling.

import type { Language } from "./translations"
import { BRIEFING_ENTRIES } from "./briefingTranslations"
import { isI18nDebugEnabled, reportDynamicMiss } from "./debug"

/** [english, hindi, bengali] */
type Entry = readonly [string, string, string]

const ENTRIES: readonly Entry[] = [
  // ── Weather conditions (WMO table + demo dataset) ───────────────────────────
  ["Clear sky", "साफ़ आसमान", "পরিষ্কার আকাশ"],
  ["Mainly clear", "मुख्यतः साफ़", "প্রধানত পরিষ্কার"],
  ["Partly cloudy", "आंशिक बादल", "আংশিক মেঘলা"],
  ["Partly Cloudy", "आंशिक बादल", "আংশিক মেঘলা"],
  ["Overcast", "घने बादल", "মেঘাচ্ছন্ন"],
  ["Cloudy", "बादल", "মেঘলা"],
  ["Fog", "कोहरा", "কুয়াশা"],
  ["Depositing rime fog", "तुषार कोहरा", "তুষারজমা কুয়াশা"],
  ["Light drizzle", "हल्की बूँदाबाँदी", "হালকা গুঁড়ি বৃষ্টি"],
  ["Moderate drizzle", "मध्यम बूँदाबाँदी", "মাঝারি গুঁড়ি বৃষ্টি"],
  ["Dense drizzle", "घनी बूँदाबाँदी", "ঘন গুঁড়ি বৃষ্টি"],
  ["Freezing drizzle", "जमा देने वाली बूँदाबाँदी", "হিমশীতল গুঁড়ি বৃষ্টি"],
  [
    "Dense freezing drizzle",
    "घनी जमा देने वाली बूँदाबाँदी",
    "ঘন হিমশীতল গুঁড়ি বৃষ্টি",
  ],
  ["Slight rain", "हल्की वर्षा", "হালকা বৃষ্টি"],
  ["Moderate rain", "मध्यम वर्षा", "মাঝারি বৃষ্টি"],
  ["Heavy rain", "भारी वर्षा", "ভারী বৃষ্টি"],
  ["Heavy Rain", "भारी वर्षा", "ভারী বৃষ্টি"],
  ["Freezing rain", "जमा देने वाली वर्षा", "হিমশীতল বৃষ্টি"],
  ["Heavy freezing rain", "भारी जमा देने वाली वर्षा", "ভারী হিমশীতল বৃষ্টি"],
  ["Slight snow", "हल्की बर्फ़बारी", "হালকা তুষারপাত"],
  ["Moderate snow", "मध्यम बर्फ़बारी", "মাঝারি তুষারপাত"],
  ["Heavy snow", "भारी बर्फ़बारी", "ভারী তুষারপাত"],
  ["Snow grains", "बर्फ़ के कण", "তুষারকণা"],
  ["Slight showers", "हल्की बौछारें", "হালকা বৃষ্টির ঝাপটা"],
  ["Moderate showers", "मध्यम बौछारें", "মাঝারি বৃষ্টির ঝাপটা"],
  ["Violent showers", "तेज़ बौछारें", "প্রবল বৃষ্টির ঝাপটা"],
  ["Slight snow showers", "हल्की हिम बौछारें", "হালকা তুষার ঝাপটা"],
  ["Heavy snow showers", "भारी हिम बौछारें", "ভারী তুষার ঝাপটা"],
  ["Thunderstorm", "आँधी-तूफ़ान", "বজ্রঝড়"],
  ["Thunderstorms", "आँधी-तूफ़ान", "বজ্রঝড়"],
  ["Thunderstorm with hail", "ओलों के साथ आँधी", "শিলাসহ বজ্রঝড়"],
  [
    "Severe thunderstorm with hail",
    "ओलों के साथ भीषण आँधी",
    "শিলাসহ প্রবল বজ্রঝড়",
  ],
  ["Storms", "तूफ़ान", "ঝড়"],
  ["Showers", "बौछारें", "বৃষ্টির ঝাপটা"],
  ["Rain", "वर्षा", "বৃষ্টি"],
  ["Bright & Sunny", "तेज़ धूप", "ঝলমলে রোদ"],
  ["Sunny", "धूप", "রোদ"],
  ["Foggy Rain", "कोहरे के साथ वर्षा", "কুয়াশাসহ বৃষ্টি"],
  ["Rough Seas", "अशांत समुद्र", "উত্তাল সমুদ্র"],

  // ── Time-of-day greeting (timeGreeting.ts) ──────────────────────────
  ["Good morning", "सुप्रभात", "সুপ্রভাত"],
  ["Good afternoon", "नमस्कार", "শুভ অপরাহ্ণ"],
  ["Good evening", "शुभ संध्या", "শুভ সন্ধ্যা"],
  ["Good night", "शुभ रात्रि", "শুভ রাত্রি"],

  // ── Device-location placeholder shown before reverse geocoding lands ────
  ["Current location", "मौजूदा स्थान", "বর্তমান অবস্থান"],

  // ── AQI categories (CPCB National AQI) ──────────────────────────────────────
  ["Good", "अच्छा", "ভালো"],
  ["Satisfactory", "संतोषजनक", "সন্তোষজনক"],
  ["Moderate", "मध्यम", "মাঝারি"],
  ["Poor", "ख़राब", "খারাপ"],
  ["Very Poor", "बहुत ख़राब", "খুব খারাপ"],
  ["Severe", "गंभीर", "মারাত্মক"],

  // ── UV bands & guidance ─────────────────────────────────────────────────────
  ["Low", "कम", "কম"],
  ["High", "अधिक", "বেশি"],
  ["Very High", "बहुत अधिक", "খুব বেশি"],
  ["Extreme", "अत्यधिक", "চরম"],
  [
    "No protection needed for most people",
    "अधिकांश लोगों को सुरक्षा की ज़रूरत नहीं",
    "অধিকাংশ মানুষের সুরক্ষার প্রয়োজন নেই",
  ],
  [
    "Use SPF 30+ if outdoors for long periods",
    "लंबे समय बाहर रहें तो SPF 30+ लगाएँ",
    "দীর্ঘক্ষণ বাইরে থাকলে SPF 30+ ব্যবহার করুন",
  ],
  ["Use SPF 30+", "SPF 30+ लगाएँ", "SPF 30+ ব্যবহার করুন"],
  [
    "Use SPF 50+ · Seek shade at midday",
    "SPF 50+ लगाएँ · दोपहर में छाया में रहें",
    "SPF 50+ ব্যবহার করুন · দুপুরে ছায়ায় থাকুন",
  ],
  [
    "Avoid midday sun · SPF 50+ mandatory",
    "दोपहर की धूप से बचें · SPF 50+ अनिवार्य",
    "দুপুরের রোদ এড়ান · SPF 50+ আবশ্যক",
  ],
  ["Carry umbrella", "छाता साथ रखें", "ছাতা সঙ্গে রাখুন"],
  ["Wear sunglasses", "धूप का चश्मा पहनें", "রোদচশমা পরুন"],
  [
    "Reapply SPF every 2h",
    "हर 2 घंटे में SPF दोबारा लगाएँ",
    "প্রতি ২ ঘণ্টায় SPF আবার লাগান",
  ],
  [
    "Light sun protection recommended for extended outdoor time",
    "लंबे समय बाहर रहने पर हल्की धूप सुरक्षा उचित है",
    "দীর্ঘক্ষণ বাইরে থাকলে হালকা রোদ-সুরক্ষা নেওয়া ভালো",
  ],

  // ── Comfort ─────────────────────────────────────────────────────────────────
  ["Comfortable", "आरामदायक", "স্বাচ্ছন্দ্যকর"],
  ["Uncomfortable", "असहज", "অস্বস্তিকর"],
  ["Very Uncomfortable", "बहुत असहज", "খুব অস্বস্তিকর"],
  [
    "Pleasant conditions for outdoor activity.",
    "बाहरी गतिविधि के लिए सुखद स्थिति।",
    "বাইরের কাজের জন্য আরামদায়ক অবস্থা।",
  ],
  [
    "Stay hydrated and take breaks if outdoors for long.",
    "पानी पीते रहें और लंबे समय बाहर हों तो विश्राम लें।",
    "জল পান করতে থাকুন এবং দীর্ঘক্ষণ বাইরে থাকলে বিরতি নিন।",
  ],
  [
    "Limit prolonged outdoor exposure; conditions are taxing.",
    "लंबे समय बाहर रहने से बचें; स्थिति कष्टकर है।",
    "দীর্ঘক্ষণ বাইরে থাকা কমান; পরিস্থিতি কষ্টকর।",
  ],
  ["Temperature", "तापमान", "তাপমাত্রা"],
  ["Humidity", "आर्द्रता", "আর্দ্রতা"],
  ["Wind", "हवा", "বাতাস"],

  // ── Hydration ───────────────────────────────────────────────────────────────
  [
    "Drink 3–4L water today · Avoid exertion 11 AM–4 PM · Use ORS if feeling dehydrated",
    "आज 3–4 लीटर पानी पिएँ · सुबह 11 से शाम 4 बजे तक मेहनत से बचें · निर्जलीकरण लगे तो ORS लें",
    "আজ ৩–৪ লিটার জল পান করুন · সকাল ১১টা–বিকেল ৪টা পরিশ্রম এড়ান · জলশূন্য লাগলে ORS নিন",
  ],
  [
    "Drink 2–3L water today · Limit strenuous activity during peak heat",
    "आज 2–3 लीटर पानी पिएँ · तेज़ गर्मी में कठिन गतिविधि सीमित रखें",
    "আজ ২–৩ লিটার জল পান করুন · প্রখর গরমে কঠিন পরিশ্রম কমান",
  ],
  [
    "Stay hydrated — drink water regularly through the day",
    "जलयोजन बनाए रखें — दिन भर नियमित पानी पिएँ",
    "জলযোজন বজায় রাখুন — সারাদিন নিয়মিত জল পান করুন",
  ],

  // ── Overview strip ──────────────────────────────────────────────────────────
  ["Health", "स्वास्थ्य", "স্বাস্থ্য"],
  ["Move", "गतिविधि", "চলাফেরা"],
  ["Good all day", "दिन भर अनुकूल", "সারাদিন উপযুক্ত"],
  ["Commute", "यात्रा", "যাতায়াত"],
  ["Outdoors", "बाहर", "বাইরে"],
  [
    "Rain likely · plan extra time",
    "वर्षा संभावित · अतिरिक्त समय रखें",
    "বৃষ্টির সম্ভাবনা · বাড়তি সময় রাখুন",
  ],
  [
    "Clear conditions expected",
    "साफ़ मौसम की उम्मीद",
    "পরিষ্কার আবহাওয়ার আশা",
  ],
  ["Flooding nearby", "आस-पास जलभराव", "কাছাকাছি জলমগ্নতা"],

  // ── Commute card ────────────────────────────────────────────────────────────
  ["DISRUPTED", "बाधित", "ব্যাহত"],
  ["CAUTION", "सावधानी", "সতর্কতা"],
  ["NORMAL", "सामान्य", "স্বাভাবিক"],
  ["Metro / Rail", "मेट्रो / रेल", "মেট্রো / রেল"],
  ["Metro Line", "मेट्रो लाइन", "মেট্রো লাইন"],
  ["Roads", "सड़कें", "রাস্তা"],
  ["Visibility", "दृश्यता", "দৃশ্যমানতা"],
  ["Possible delays", "देरी संभव", "দেরি হতে পারে"],
  ["Minor delays possible", "थोड़ी देरी संभव", "সামান্য দেরি হতে পারে"],
  ["Normal service", "सामान्य सेवा", "স্বাভাবিক পরিষেবা"],
  ["Poor conditions", "ख़राब स्थिति", "খারাপ অবস্থা"],
  ["Drive with caution", "सावधानी से चलाएँ", "সাবধানে চালান"],
  ["Clear conditions", "साफ़ स्थिति", "পরিষ্কার অবস্থা"],
  ["Reduced visibility", "कम दृश्यता", "কম দৃশ্যমানতা"],
  ["Good visibility", "अच्छी दृश्यता", "ভালো দৃশ্যমানতা"],
  [
    "Weather-related delays possible",
    "मौसम के कारण देरी संभव",
    "আবহাওয়ার কারণে দেরি হতে পারে",
  ],
  ["No known disruption", "कोई ज्ञात बाधा नहीं", "জানা কোনো ব্যাঘাত নেই"],
  [
    "Waterlogging possible in low-lying areas",
    "निचले इलाकों में जलभराव संभव",
    "নিচু এলাকায় জল জমতে পারে",
  ],
  [
    "Standard driving conditions",
    "सामान्य ड्राइविंग स्थिति",
    "স্বাভাবিক গাড়ি চালানোর অবস্থা",
  ],
  ["Modified", "बदला हुआ", "পরিবর্তিত"],
  ["Flooded", "जलमग्न", "জলমগ্ন"],
  ["Delays expected", "देरी की आशंका", "দেরির আশঙ্কা"],

  // ── Pollen ──────────────────────────────────────────────────────────────────
  ["Tree", "वृक्ष", "গাছ"],
  ["Grass", "घास", "ঘাস"],
  ["Weed", "खरपतवार", "আগাছা"],

  // ── Pollen guidance ────────────────────────────────────────────
  [
    "Keep windows closed 10 AM–3 PM · Antihistamine recommended if allergy-prone",
    "सुबह 10 से दोपहर 3 बजे तक खिड़कियाँ बंद रखें · एलर्जी हो तो एंटीहिस्टामीन लेना उचित",
    "সকাল ১০টা–বিকেল ৩টা জানলা বন্ধ রাখুন · অ্যালার্জি থাকলে অ্যান্টিহিস্টামিন নেওয়া ভালো",
  ],

  // ── Packing list ────────────────────────────────────────────────────────────
  [
    "Umbrella / rain protection",
    "छाता / वर्षा सुरक्षा",
    "ছাতা / বৃষ্টির সুরক্ষা",
  ],
  ["Heavy duty umbrella", "मज़बूत छाता", "মজবুত ছাতা"],
  ["Waterproof footwear", "जलरोधी जूते", "জলরোধী জুতো"],
  ["Sunscreen SPF 30+", "सनस्क्रीन SPF 30+", "সানস্ক্রিন SPF 30+"],
  ["Sunglasses", "धूप का चश्मा", "রোদচশমা"],
  ["Light jacket / layer", "हल्की जैकेट / परत", "হালকা জ্যাকেট / আস্তরণ"],
  ["Water bottle (1L+)", "पानी की बोतल (1L+)", "জলের বোতল (১L+)"],
  ["Windproof outer layer", "हवारोधी बाहरी परत", "বাতাসরোধী বাইরের আস্তরণ"],
  ["N95 mask", "N95 मास्क", "N95 মাস্ক"],
  ["High rain chance today", "आज वर्षा की अधिक संभावना", "আজ বৃষ্টির প্রবল সম্ভাবনা"],
  ["Severe waterlogging", "भीषण जलभराव", "তীব্র জলমগ্নতা"],

  // ── Seasonal event planner ───────────────────────────────────
  [
    "Event planners: Provide shade and water stations. Rain disruption probability is about 30%.",
    "आयोजकों के लिए: छाया और पानी की व्यवस्था रखें। वर्षा से बाधा की संभावना लगभग 30% है।",
    "অনুষ্ঠান পরিকল্পকদের জন্য: ছায়া ও জলের ব্যবস্থা রাখুন। বৃষ্টিতে বিঘ্ন হওয়ার সম্ভাবনা প্রায় ৩০%।",
  ],

  // ── Running window ──────────────────────────────────────────────────────────
  ["FITNESS", "फ़िटनेस", "ফিটনেস"],
  ["Today", "आज", "আজ"],
  ["Tomorrow", "कल", "আগামীকাল"],
  ["Unavailable", "अनुपलब्ध", "অনুপলব্ধ"],
  ["Before humidity peaks", "आर्द्रता बढ़ने से पहले", "আর্দ্রতা বাড়ার আগে"],

  // ── Hourly slot label (normalizer) ─────────────────────────────────
  ["Now", "अभी", "এখন"],

  // ── Bare units that arrive as their own payload field ──────────────
  // rainfall.unit is rendered beside its number rather than inside a
  // template, so it needs translating on its own like any other value.
  ["mm", "मिमी", "মিমি"],
  ["km", "किमी", "কিমি"],
  ["km/h", "किमी/घंटा", "কিমি/ঘন্টা"],

  // ── Observation timestamps (normalizer, CPCB feed) ─────────────────
  ["Updated just now", "अभी-अभी अपडेट किया गया", "এইমাত্র আপডেট করা হয়েছে"],

  // ── Compass points (degreesToCompass) ────────────────────────────
  // Abbreviated the way Indian forecasts do, so they still fit the wind tile.
  ["N", "उ", "উ"],
  ["NNE", "उ-उपू", "উ-উপূ"],
  ["NE", "उपू", "উপূ"],
  ["ENE", "पू-उपू", "পূ-উপূ"],
  ["E", "पू", "পূ"],
  ["ESE", "पू-दपू", "পূ-দপূ"],
  ["SE", "दपू", "দপূ"],
  ["SSE", "द-दपू", "দ-দপূ"],
  ["S", "द", "দ"],
  ["SSW", "द-दप", "দ-দপ"],
  ["SW", "दप", "দপ"],
  ["WSW", "प-दप", "প-দপ"],
  ["W", "प", "প"],
  ["WNW", "प-उप", "প-উপ"],
  ["NW", "उप", "উপ"],
  ["NNW", "उ-उप", "উ-উপ"],

  // ── Route and landmark names in the demo dataset ──────────────────
  // Proper nouns, so these are transliterated rather than translated.
  ["EM Bypass", "ईएम बाईपास", "ইএম বাইপাস"],
  ["Howrah Br.", "हावड़ा ब्रिज", "হাওড়া ব্রিজ"],
  ["Park St · Behala", "पार्क स्ट्रीट · बेहाला", "পার্ক স্ট্রিট · বেহালা"],

  // ── Moon phases ─────────────────────────────────────────────────────────────
  ["Sunrise", "सूर्योदय", "সূর্যোদয়"],
  ["Sunset", "सूर्यास्त", "সূর্যাস্ত"],
  ["New Moon", "अमावस्या", "অমাবস্যা"],
  ["Waxing Crescent", "शुक्ल बालचंद्र", "শুক্ল কলা"],
  ["First Quarter", "प्रथम चतुर्थांश", "প্রথম পক্ষ"],
  ["Waxing Gibbous", "शुक्ल गिब्बस", "বর্ধমান গিব্বাস"],
  ["Full Moon", "पूर्णिमा", "পূর্ণিমা"],
  ["Waning Gibbous", "कृष्ण गिब्बस", "ক্ষীয়মাণ গিব্বাস"],
  ["Last Quarter", "अंतिम चतुर्थांश", "শেষ পক্ষ"],
  ["Waning Crescent", "कृष्ण बालचंद्र", "কৃষ্ণ কলা"],

  // ── Months (rainfall labels) ────────────────────────────────────────────────
  ["January", "जनवरी", "জানুয়ারি"],
  ["February", "फ़रवरी", "ফেব্রুয়ারি"],
  ["March", "मार्च", "মার্চ"],
  ["April", "अप्रैल", "এপ্রিল"],
  ["May", "मई", "মে"],
  ["June", "जून", "জুন"],
  ["July", "जुलाई", "জুলাই"],
  ["August", "अगस्त", "আগস্ট"],
  ["September", "सितंबर", "সেপ্টেম্বর"],
  ["October", "अक्तूबर", "অক্টোবর"],
  ["November", "नवंबर", "নভেম্বর"],
  ["December", "दिसंबर", "ডিসেম্বর"],

  // ── Weekday abbreviations (7-day list) ──────────────────────────────────────
  ["Mon", "सोम", "সোম"],
  ["Tue", "मंगल", "মঙ্গল"],
  ["Wed", "बुध", "বুধ"],
  ["Thu", "गुरु", "বৃহঃ"],
  ["Fri", "शुक्र", "শুক্র"],
  ["Sat", "शनि", "শনি"],
  ["Sun", "रवि", "রবি"],

  // ── Curated weather advisories (lib/data/curatedAlerts.ts) ────────────
  ["Mausam Weather Advisory", "मौसम मौसम परामर्श", "মৌসম আবহাওয়া পরামর্শ"],
  ["Extreme Heat Warning", "भीषण गर्मी की चेतावनी", "প্রচণ্ড গরমের সতর্কতা"],
  ["Heatwave Advisory", "लू परामर्श", "তাপপ্রবাহ পরামর্শ"],
  ["Heavy Rainfall Warning", "भारी वर्षा की चेतावनी", "ভারী বৃষ্টির সতর্কতা"],
  ["Monsoon Flooding Risk", "मानसून बाढ़ का खतरा", "বর্ষায় বন্যার আশঙ্কা"],
  ["Poor Air Quality Advisory", "ख़राब वायु गुणवत्ता परामर्श", "খারাপ বায়ুমান পরামর্শ"],
  ["Strong Wind Advisory", "तेड़ हवा परामर्श", "জোরালো বাতাসের পরামর্শ"],
  ["Thunderstorm Advisory", "आँधी-तूफ़ान परामर्श", "বজ্রঝড়ের পরামর্শ"],
  [
    "Dangerously high temperatures expected. Avoid outdoor exertion during peak hours.",
    "खतरनाक रूप से अधिक तापमान की आशंका है। चरम समय में बाहरी मेहनत से बचें।",
    "বিপজ্জনকভাবে বেশি তাপমাত্রার আশঙ্কা। সর্বোচ্চ সময়ে বাইরে পরিশ্রম এড়ান।",
  ],
  [
    "High temperatures expected. Stay hydrated and limit midday outdoor activity.",
    "अधिक तापमान की आशंका है। पानी पीते रहें और दोपहर में बाहरी गतिविधि सीमित रखें।",
    "বেশি তাপমাত্রার আশঙ্কা। জল পান করতে থাকুন এবং দুপুরে বাইরের কাজ কমান।",
  ],
  [
    "High rain chance during peak monsoon season. Low-lying areas may experience waterlogging.",
    "मानसून के चरम पर वर्षा की अधिक संभावना है। निचले इलाकों में जलभराव हो सकता है।",
    "বর্ষার ভরা মৌসুমে বৃষ্টির প্রবল সম্ভাবনা। নিচু এলাকায় জল জমতে পারে।",
  ],
  [
    "Air quality is unhealthy for sensitive groups. Consider limiting prolonged outdoor exertion.",
    "संवेदनशील लोगों के लिए वायु गुणवत्ता अस्वास्थ्यकर है। लंबे समय तक बाहरी मेहनत सीमित रखें।",
    "সংবেদনশীল মানুষের জন্য বায়ুর মান অস্বাস্থ্যকর। দীর্ঘক্ষণ বাইরে পরিশ্রম কমান।",
  ],
  [
    "Thunderstorms expected. Avoid open areas, tall isolated trees, and unnecessary travel.",
    "आँधी-तूफ़ान की आशंका है। खुली जगहों, अलग-थलग ऊंचे पेड़ों और गैर-ज़रूरी यात्रा से बचें।",
    "বজ্রঝড়ের আশঙ্কা। খোলা জায়গা, বিচ্ছিন্ন উঁচু গাছ ও অপ্রয়োজনীয় যাত্রা এড়ান।",
  ],
  ["Just now", "अभी-अभी", "এইমাত্র"],

  // ── Demo-only Kolkata bulletins ────────────────────────────────────
  ["Waterlogging — EM Bypass", "जलभराव — ईएम बाईपास", "জলমগ্নতা — ইএম বাইপাস"],
  ["Ganga Ferry Suspended", "गंगा फ़ेरी सेवा स्थगित", "গঙ্গা ফেরি পরিষেবা বন্ধ"],
  [
    "IMD red alert: 115mm+ rain expected in next 24h. Avoid underpasses, the Maidan, and low-lying Behala.",
    "IMD रेड अलर्ट: अगले 24 घंटे में 115मिमी+ वर्षा संभावित। अंडरपास, मैदान और निचले बेहाला से बचें।",
    "IMD রেড অ্যালার্ট: পরবর্তী ২৪ ঘণ্টায় ১১৫মিমি+ বৃষ্টির সম্ভাবনা। আন্ডারপাস, ময়দান ও নিচু বেহালা এড়ান।",
  ],
  [
    "Severe waterlogging on EM Bypass, Park Street, Kasba. Metro running on modified schedule. Allow extra time.",
    "ईएम बाईपास, पार्क स्ट्रीट और कसबा में भीषण जलभराव। मेट्रो बदले हुए समय पर चल रही है। अतिरिक्त समय रखें।",
    "ইএম বাইপাস, পার্ক স্ট্রিট ও কসবায় তীব্র জলমগ্নতা। মেট্রো পরিবর্তিত সময়সূচিতে চলছে। বাড়তি সময় রাখুন।",
  ],
  [
    "Wind gusts 45 km/h. All ferry services on the Hooghly suspended until further notice.",
    "45 किमी/घंटा के झोंके। हुगली पर सभी फ़ेरी सेवाएँ अगले आदेश तक स्थगित।",
    "৪৫ কিমি/ঘন্টা বাতাসের ঝাপটা। হুগলিতে সব ফেরি পরিষেবা পরবর্তী নির্দেশ পর্যন্ত বন্ধ।",
  ],

  // ── Packing extras and the seasonal event card ─────────────────────
  ["Power bank", "पावर बैंक", "পাওয়ার ব্যাঙ্ক"],
  ["Power cuts likely", "बिजली कटौती संभावित", "বিদ্যুৎ বিভ্রাটের সম্ভাবনা"],
  ["Event Planner", "आयोजन प्लानर", "অনুষ্ঠান পল্যানার"],
  ["Post-monsoon", "मानसून के बाद", "বর্ষা-পরবর্তী"],
  ["Low Rain", "कम वर्षा", "কম বৃষ্টি"],
  ["Foggy", "कोहरा", "কুয়াশাচ্ছন্ন"],
  [
    "Plan pandal visits 5–9 AM for best weather. Avoid afternoons during the first two days.",
    "सबसे अच्छे मौसम के लिए पंडाल घूमने का समय सुबह 5–9 रखें। पहले दो दिन दोपहर से बचें।",
    "সবচেয়ে ভালো আবহাওয়ার জন্য প্যান্ডেল দেখার সময় সকাল ৫–৯টা রাখুন। প্রথম দুই দিন বিকেল এড়ান।",
  ],

  // ── Alert / advisory severity ───────────────────────────────────────────────
  ["Red", "लाल", "লাল"],
  ["Orange", "नारंगी", "কমলা"],
  ["Yellow", "पीला", "হলুদ"],
  ["Minor", "मामूली", "সামান্য"],
  ["Unknown", "अज्ञात", "অজানা"],

  // ── Profile vocabulary (stored in English, shown translated) ────────────────
  ["Dust", "धूल", "ধুলো"],
  ["Pollen", "पराग", "পরাগ"],
  ["AQI / smoke", "AQI / धुआँ", "AQI / ধোঁয়া"],
  ["Heat", "गर्मी", "গরম"],
  ["Monsoon damp", "मानसून की सीलन", "বর্ষার স্যাঁতসেঁতে ভাব"],
  ["Cold", "ठंड", "ঠান্ডা"],
  ["UV / sun", "UV / धूप", "UV / রোদ"],
  ["Asthma", "दमा", "হাঁপানি"],
  ["Allergies", "एलर्जी", "অ্যালার্জি"],
  ["Migraine", "माइग्रेन", "মাইগ্রেন"],
  ["Skin sensitivity", "त्वचा संवेदनशीलता", "ত্বকের সংবেদনশীলতা"],
  ["Heart health", "हृदय स्वास्थ्य", "হৃদযন্ত্রের স্বাস্থ্য"],
  ["None of these", "इनमें से कोई नहीं", "এর কোনোটিই নয়"],
  ["Daily energy", "दैनिक ऊर्जा", "দৈনিক শক্তি"],
  ["Outdoor plans", "बाहरी योजनाएँ", "বাইরের পরিকল্পনা"],
  ["Fitness", "फ़िटनेस", "ফিটনেস"],
  ["Sleep", "नींद", "ঘুম"],
  ["Travel", "यात्रा", "ভ্রমণ"],
  ["Family care", "परिवार की देखभाल", "পরিবারের যত্ন"],
  ["Female", "महिला", "নারী"],
  ["Male", "पुरुष", "পুরুষ"],
  ["Non-binary", "नॉन-बाइनरी", "নন-বাইনারি"],
  ["Prefer not to say", "बताना नहीं चाहते", "বলতে চাই না"],

  // ── Lifestyle personas ──────────────────────────────────────────────────────
  ["Health-conscious", "स्वास्थ्य के प्रति सजग", "স্বাস্থ্য-সচেতন"],
  [
    "Allergy, asthma & skin shield",
    "एलर्जी, दमा और त्वचा की ढाल",
    "অ্যালার্জি, হাঁপানি ও ত্বকের ঢাল",
  ],
  ["Air Quality (AQI)", "वायु गुणवत्ता (AQI)", "বায়ুর মান (AQI)"],
  ["Pollen & Allergens", "पराग और एलर्जन", "পরাগ ও অ্যালার্জেন"],
  ["UV & Skin Index", "UV और त्वचा सूचकांक", "UV ও ত্বক সূচক"],
  ["Humidity Levels", "आर्द्रता स्तर", "আর্দ্রতার মাত্রা"],
  [
    "Outdoor fitness enthusiasts",
    "बाहरी फ़िटनेस के शौक़ीन",
    "আউটডোর ফিটনেসপ্রেমী",
  ],
  [
    "Best running hours & thermal stamina",
    "दौड़ने के सर्वोत्तम घंटे और ताप सहनशक्ति",
    "দৌড়ানোর সেরা সময় ও তাপ-সহনশক্তি",
  ],
  ["Best Running Hours", "दौड़ने के सर्वोत्तम घंटे", "দৌড়ানোর সেরা সময়"],
  ["Sunrise / Sunset", "सूर्योदय / सूर्यास्त", "সূর্যোদয় / সূর্যাস্ত"],
  ["Wind & Gusts", "हवा और झोंके", "বাতাস ও ঝাপটা"],
  ["Heat Alerts", "गर्मी की चेतावनी", "গরমের সতর্কতা"],
  ["Beachgoers & surfers", "समुद्र तट और सर्फ़र", "সৈকতপ্রেমী ও সার্ফার"],
  [
    "Sea conditions, swell & tide timings",
    "समुद्री स्थिति, लहरें और ज्वार समय",
    "সমুদ্রের অবস্থা, ঢেউ ও জোয়ারের সময়",
  ],
  ["Sea Conditions", "समुद्री स्थिति", "সমুদ্রের অবস্থা"],
  ["Tide Timings", "ज्वार-भाटा समय", "জোয়ার-ভাটার সময়"],
  ["Wave Height", "लहर की ऊँचाई", "ঢেউয়ের উচ্চতা"],
  ["Water Temperature", "जल तापमान", "জলের তাপমাত্রা"],
  ["Travelers", "यात्री", "ভ্রমণকারী"],
  [
    "Saved destinations & transit alerts",
    "सहेजे गंतव्य और यात्रा चेतावनी",
    "সংরক্ষিত গন্তব্য ও যাত্রার সতর্কতা",
  ],
  ["Flight Weather Alerts", "उड़ान मौसम चेतावनी", "ফ্লাইট আবহাওয়া সতর্কতা"],
  ["Packing Suggestions", "पैकिंग सुझाव", "প্যাকিং পরামর্শ"],
  ["Saved Destinations", "सहेजे गए गंतव्य", "সংরক্ষিত গন্তব্য"],
  ["Severe Weather", "भीषण मौसम", "প্রবল আবহাওয়া"],
  ["Parents & families", "माता-पिता और परिवार", "অভিভাবক ও পরিবার"],
  [
    "School commute & daily routine safety",
    "स्कूल यात्रा और दिनचर्या की सुरक्षा",
    "স্কুলে যাতায়াত ও দৈনন্দিন রুটিনের নিরাপত্তা",
  ],
  ["School Commute", "स्कूल यात्रा", "স্কুলে যাতায়াত"],
  ["Rain Alerts", "वर्षा चेतावनी", "বৃষ্টির সতর্কতা"],
  ["Severe Warnings", "गंभीर चेतावनियाँ", "মারাত্মক সতর্কবার্তা"],
  ["Kids Comfort Index", "बच्चों का आराम सूचकांक", "শিশুদের স্বাচ্ছন্দ্য সূচক"],
  ["Agriculture & gardeners", "कृषि और बाग़वानी", "কৃষি ও বাগানচর্চা"],
  [
    "Soil moisture & seasonal planting",
    "मिट्टी की नमी और मौसमी बुवाई",
    "মাটির আর্দ্রতা ও মৌসুমি চাষ",
  ],
  ["Soil Moisture", "मिट्टी की नमी", "মাটির আর্দ্রতা"],
  ["Rain Predictions", "वर्षा पूर्वानुमान", "বৃষ্টির পূর্বাভাস"],
  ["Frost Alerts", "पाला चेतावनी", "তুষারপাতের সতর্কতা"],
  ["Planting Guidance", "बुवाई मार्गदर्शन", "চাষের দিকনির্দেশ"],
  ["Commuters", "यात्री (दैनिक)", "নিত্যযাত্রী"],
  [
    "Visibility, traffic flow & storm alerts",
    "दृश्यता, यातायात प्रवाह और तूफ़ान चेतावनी",
    "দৃশ্যমানতা, যান চলাচল ও ঝড়ের সতর্কতা",
  ],
  ["Fog & Smog Visibility", "कोहरा और स्मॉग दृश्यता", "কুয়াশা ও ধোঁয়াশার দৃশ্যমানতা"],
  ["Traffic Weather", "यातायात मौसम", "যানবাহনের আবহাওয়া"],
  ["Storm Alerts", "तूफ़ान चेतावनी", "ঝড়ের সতর্কতা"],
  ["Commute Timing", "यात्रा समय", "যাতায়াতের সময়"],
  ["Event planners", "आयोजन नियोजक", "অনুষ্ঠান পরিকল্পক"],
  [
    "Extended forecasts & comfort index",
    "विस्तृत पूर्वानुमान और आराम सूचकांक",
    "বিস্তারিত পূর্বাভাস ও স্বাচ্ছন্দ্য সূচক",
  ],
  ["14-Day Outlook", "14-दिन का पूर्वानुमान", "১৪-দিনের পূর্বাভাস"],
  ["Rain Probability", "वर्षा की संभावना", "বৃষ্টির সম্ভাবনা"],
  ["Comfort Index", "आराम सूचकांक", "স্বাচ্ছন্দ্য সূচক"],
  ["Outdoor Gatherings", "बाहरी आयोजन", "বাইরের জমায়েত"],
]

const LOOKUP: Record<string, Record<Language, string>> = {}
for (const [english, hindi, bengali] of [...ENTRIES, ...BRIEFING_ENTRIES]) {
  LOOKUP[english] = { en: english, hi: hindi, bn: bengali }
}

/**
 * Composite values that embed a number or a nested phrase. Each replacement
 * may reference capture groups (`$1`) and `@n`, which re-runs the translator
 * on capture group n so nested vocabulary is translated too.
 */
const PATTERNS: ReadonlyArray<{
  match: RegExp
  hi: string
  bn: string
}> = [
  { match: /^India AQI (\d+) · UV (\d+)$/, hi: "भारत AQI $1 · UV $2", bn: "ভারত AQI $1 · UV $2" },
  { match: /^UV (\d+) · (.+)$/, hi: "UV $1 · @2", bn: "UV $1 · @2" },
  { match: /^Best window (.+)$/, hi: "सर्वोत्तम समय $1", bn: "সেরা সময় $1" },
  { match: /^Run (.+)$/, hi: "दौड़ $1", bn: "দৌড় $1" },
  { match: /^Wind (\d+(?:\.\d+)?) km\/h$/, hi: "हवा $1 किमी/घंटा", bn: "বাতাস $1 কিমি/ঘন্টা" },
  { match: /^(\d+(?:\.\d+)?) km\/h$/, hi: "$1 किमी/घंटा", bn: "$1 কিমি/ঘন্টা" },
  { match: /^(\d+(?:\.\d+)?) ?km$/, hi: "$1 किमी", bn: "$1 কিমি" },
  { match: /^(\d+(?:\.\d+)?)m$/, hi: "$1 मी", bn: "$1 মি" },
  { match: /^Around (.+)$/, hi: "लगभग $1", bn: "প্রায় $1" },
  { match: /^~(\d+) min$/, hi: "~$1 मिनट", bn: "~$1 মিনিট" },
  { match: /^(\d+)% rain chance$/, hi: "$1% वर्षा संभावना", bn: "$1% বৃষ্টির সম্ভাবনা" },
  { match: /^For (.+) · (.+)$/, hi: "$1 के लिए · $2", bn: "$1-এর জন্য · $2" },
  // Observation timestamps. The backend formats the clock itself (English-only
  // contract), so the wrapper is translated and the "4:00 pm" kept verbatim —
  // digits and AM/PM read the same in all three scripts (see numberFormat.ts).
  { match: /^Updated at (.+)$/, hi: "$1 पर अपडेट", bn: "$1-এ আপডেট" },
  { match: /^Station update: (.+)$/, hi: "स्टेशन अपडेट: $1", bn: "স্টেশন আপডেট: $1" },
  { match: /^(\d+)h ago$/, hi: "$1 घंटे पहले", bn: "$1 ঘণ্টা আগে" },
  { match: /^(\d+)m ago$/, hi: "$1 मिनट पहले", bn: "$1 মিনিট আগে" },
  { match: /^UV Index (\d+) \((.+)\)$/, hi: "UV सूचकांक $1 (@2)", bn: "UV সূচক $1 (@2)" },
  { match: /^AQI (\d+) \((.+)\)$/, hi: "AQI $1 (@2)", bn: "AQI $1 (@2)" },
  { match: /^Heat index (\d+)°C$/, hi: "ताप सूचकांक $1°C", bn: "তাপ সূচক $1°C" },
  { match: /^Rough seas · (.+)$/, hi: "अशांत समुद्र · $1", bn: "উত্তাল সমুদ্র · $1" },
]

const EMOJI_PREFIX = /^((?:[\p{Extended_Pictographic}️‍⃣]|\s)+)(.+)$/u

function applyPattern(language: Exclude<Language, "en">, value: string): string | undefined {
  for (const pattern of PATTERNS) {
    const match = value.match(pattern.match)
    if (!match) continue
    return pattern[language].replace(/@(\d)|\$(\d)/g, (_, nested?: string, plain?: string) => {
      const group = match[Number(nested ?? plain)] ?? ""
      return nested ? translateDynamic(language, group) : group
    })
  }
  return undefined
}

/**
 * Translates one API/rules-generated string. Returns `value` unchanged when it
 * is not part of the known vocabulary, so free text (station names, government
 * bulletin bodies, place names) always survives intact.
 */
export function translateDynamic(language: Language, value: string): string
export function translateDynamic(
  language: Language,
  value: string | undefined,
): string | undefined
export function translateDynamic(
  language: Language,
  value: string | undefined,
): string | undefined {
  if (language === "en" || !value) return value
  const trimmed = value.trim()
  if (!trimmed) return value

  const exact = LOOKUP[trimmed]?.[language]
  if (exact) return exact

  const patterned = applyPattern(language, trimmed)
  if (patterned) return patterned

  // "🧴 Reapply SPF every 2h" → translate the words, keep the emoji.
  const emoji = trimmed.match(EMOJI_PREFIX)
  if (emoji) {
    const rest = translateDynamic(language, emoji[2])
    if (rest !== emoji[2]) return `${emoji[1]}${rest}`
  }

  // "Use SPF 50+ · Seek shade at midday" style compounds: translate each
  // segment, and only rebuild the string if at least one segment was known.
  if (trimmed.includes(" · ")) {
    const segments = trimmed.split(" · ")
    const translated = segments.map((segment) =>
      translateDynamic(language, segment),
    )
    if (translated.some((segment, index) => segment !== segments[index]))
      return translated.join(" · ")
  }

  // Nothing matched. The value is returned as-is (free text usually should be),
  // but debug mode records it so the overlay can name what it highlighted.
  if (isI18nDebugEnabled()) reportDynamicMiss(trimmed)
  return value
}

/** Convenience for arrays of vocabulary values (chips, tags, scale labels). */
export function translateDynamicList(
  language: Language,
  values: readonly string[],
): string[] {
  return values.map((value) => translateDynamic(language, value))
}
