// Vocabulary for the "Your Mausam" personalised briefing.
//
// PERSONALIZED_VARIANTS in App.tsx is the local, deterministic briefing the
// page shows immediately (and keeps whenever the backend briefing endpoint is
// unconfigured or fails). Its copy is fixed, so it translates through the same
// exact-match lookup as the rest of the dynamic vocabulary.
//
// Purely numeric values — "19°C", "68%", "6:00 AM – 9:30 AM" — are deliberately
// absent: they carry no words, so passing them through unchanged is correct.
// Backend-generated briefings are free text and likewise pass through.

/** [english, hindi, bengali] */
export const BRIEFING_ENTRIES: ReadonlyArray<readonly [string, string, string]> = [
  // ── Headlines ───────────────────────────────────────────────────────────────
  [
    "Plan around the strongest midday sun.",
    "दोपहर की तेज़ धूप को ध्यान में रखकर योजना बनाएँ।",
    "দুপুরের প্রখর রোদ মাথায় রেখে পরিকল্পনা করুন।",
  ],
  [
    "A bright, hot day needs an earlier start.",
    "तेज़ धूप वाले गर्म दिन के लिए जल्दी शुरुआत करें।",
    "ঝলমলে গরম দিনে আগেভাগে শুরু করাই ভালো।",
  ],
  [
    "Strong sun, with a softer evening window.",
    "तेज़ धूप, पर शाम का समय नरम रहेगा।",
    "প্রখর রোদ, তবে সন্ধ্যাটা অনেক নরম।",
  ],
  [
    "Air quality is today’s main signal.",
    "आज वायु गुणवत्ता ही मुख्य संकेत है।",
    "আজ বায়ুর মানই প্রধান সংকেত।",
  ],
  [
    "Comfortable by day, cooler at the edges.",
    "दिन में आरामदायक, सुबह-शाम ठंडक।",
    "দিনে আরামদায়ক, ভোরে-সন্ধ্যায় ঠান্ডা।",
  ],
  [
    "Warm, humid, with rain worth planning around.",
    "गर्म, उमस भरा, और वर्षा को ध्यान में रखना बेहतर।",
    "গরম, আর্দ্র, আর বৃষ্টির কথা মাথায় রাখা ভালো।",
  ],

  // ── Overviews ───────────────────────────────────────────────────────────────
  [
    "Strong UV exposure is expected around midday. Since you marked skin sensitivity, your better outdoor window is earlier in the morning or later in the day. Keep sun protection in mind during peak exposure.",
    "दोपहर के आसपास तेज़ UV की आशंका है। आपने त्वचा संवेदनशीलता चुनी है, इसलिए बाहर निकलने का बेहतर समय सुबह जल्दी या दिन ढलने के बाद है। चरम समय में धूप से बचाव का ध्यान रखें।",
    "দুপুরের দিকে প্রবল UV প্রত্যাশিত। আপনি ত্বকের সংবেদনশীলতা বেছে নিয়েছেন, তাই বাইরে যাওয়ার ভালো সময় ভোরের দিকে বা বিকেলের পরে। সর্বোচ্চ সময়ে রোদ-সুরক্ষার কথা মনে রাখুন।",
  ],
  [
    "Today will feel hot and bright in Kolkata. UV levels will become very high around midday, while temperatures peak in the afternoon. Your better outdoor window is before 10 AM or after 5 PM.",
    "आज कोलकाता में गर्मी और तेज़ धूप महसूस होगी। दोपहर के आसपास UV बहुत अधिक हो जाएगा और तापमान दोपहर में चरम पर रहेगा। बाहर निकलने का बेहतर समय सुबह 10 बजे से पहले या शाम 5 बजे के बाद है।",
    "আজ কলকাতায় গরম ও ঝলমলে রোদ থাকবে। দুপুরের দিকে UV খুব বেশি হবে, আর তাপমাত্রা বিকেলে সর্বোচ্চ। বাইরে যাওয়ার ভালো সময় সকাল ১০টার আগে বা বিকেল ৫টার পরে।",
  ],
  [
    "Air quality is the main thing to watch today. AQI is currently elevated and may remain poor through the afternoon. Consider indoor exercise and limit prolonged outdoor exposure during peak pollution.",
    "आज सबसे ज़्यादा ध्यान वायु गुणवत्ता पर देना है। AQI इस समय बढ़ा हुआ है और दोपहर भर ख़राब रह सकता है। व्यायाम घर के अंदर करने पर विचार करें और अधिक प्रदूषण के समय लंबे समय तक बाहर न रहें।",
    "আজ সবচেয়ে বেশি নজর রাখতে হবে বায়ুর মানে। AQI এখন বর্ধিত এবং বিকেল পর্যন্ত খারাপ থাকতে পারে। ঘরের ভিতরে ব্যায়াম করার কথা ভাবুন এবং বেশি দূষণের সময় দীর্ঘক্ষণ বাইরে থাকা কমান।",
  ],
  [
    "Temperatures will remain comfortable during the day but become noticeably cooler after sunset. If you are heading outside early or late, an extra layer will make the evening more comfortable.",
    "दिन भर तापमान आरामदायक रहेगा, पर सूर्यास्त के बाद ठंडक साफ़ महसूस होगी। सुबह जल्दी या देर शाम बाहर जा रहे हों तो एक अतिरिक्त परत शाम को ज़्यादा आरामदायक बना देगी।",
    "দিনের বেলা তাপমাত্রা আরামদায়ক থাকবে, তবে সূর্যাস্তের পরে বেশ ঠান্ডা লাগবে। ভোরে বা রাতে বেরোলে বাড়তি একটি আস্তরণ সন্ধ্যাটা আরও আরামদায়ক করে তুলবে।",
  ],
  [
    "Today looks warm with periods of rain. Conditions are generally comfortable, but humidity will rise through the afternoon. Keep an umbrella nearby if you’ll be out later.",
    "आज गर्मी के साथ रुक-रुक कर वर्षा के आसार हैं। स्थिति आम तौर पर आरामदायक है, पर दोपहर तक उमस बढ़ेगी। देर से बाहर रहने वाले हों तो छाता पास रखें।",
    "আজ গরমের সঙ্গে থেমে থেমে বৃষ্টির সম্ভাবনা। পরিস্থিতি মোটামুটি আরামদায়ক, তবে বিকেলের দিকে আর্দ্রতা বাড়বে। পরে বাইরে থাকলে ছাতা কাছে রাখুন।",
  ],
  [
    "Poor air and reduced visibility are the main concerns.",
    "ख़राब हवा और कम दृश्यता मुख्य चिंता हैं।",
    "খারাপ বাতাস ও কম দৃশ্যমানতাই প্রধান উদ্বেগ।",
  ],
  [
    "Strong sunshine is expected today, with UV reaching very high levels around midday. Outdoor plans will be more comfortable earlier in the morning or toward sunset.",
    "आज तेज़ धूप की आशंका है और दोपहर के आसपास UV बहुत अधिक हो जाएगा। बाहरी योजनाएँ सुबह जल्दी या सूर्यास्त के करीब अधिक आरामदायक रहेंगी।",
    "আজ প্রখর রোদ প্রত্যাশিত, দুপুরের দিকে UV খুব বেশি হবে। বাইরের পরিকল্পনা ভোরের দিকে বা সূর্যাস্তের কাছাকাছি বেশি আরামদায়ক হবে।",
  ],

  // ── Window labels ───────────────────────────────────────────────────────────
  ["Lower exposure", "कम जोखिम", "কম সংস্পর্শ"],
  ["Best outdoor window", "बाहर निकलने का सर्वोत्तम समय", "বাইরে যাওয়ার সেরা সময়"],
  ["Best overall window", "कुल मिलाकर सर्वोत्तम समय", "সব মিলিয়ে সেরা সময়"],
  ["Best time to move", "गतिविधि का सर्वोत्तम समय", "চলাফেরার সেরা সময়"],
  ["Better outdoor window", "बेहतर बाहरी समय", "বাইরে যাওয়ার ভালো সময়"],
  ["Better outdoor light", "बेहतर बाहरी रोशनी", "বাইরের ভালো আলো"],
  ["Better for exercise", "व्यायाम के लिए बेहतर", "ব্যায়ামের জন্য ভালো"],
  ["Cleaner window", "साफ़ हवा का समय", "পরিষ্কার বাতাসের সময়"],
  ["Most comfortable", "सबसे आरामदायक", "সবচেয়ে আরামদায়ক"],
  ["Before 9 AM", "सुबह 9 बजे से पहले", "সকাল ৯টার আগে"],
  [
    "Before 9 AM or after 5 PM",
    "सुबह 9 बजे से पहले या शाम 5 बजे के बाद",
    "সকাল ৯টার আগে বা বিকেল ৫টার পরে",
  ],
  ["After 7 PM", "शाम 7 बजे के बाद", "সন্ধ্যা ৭টার পরে"],
  ["Around 5:30 PM", "शाम 5:30 बजे के आसपास", "বিকেল ৫:৩০-এর কাছাকাছি"],
  ["Possible after 4 PM", "शाम 4 बजे के बाद संभव", "বিকেল ৪টার পরে সম্ভব"],
  ["Better after 5 PM", "शाम 5 बजे के बाद बेहतर", "বিকেল ৫টার পরে ভালো"],
  ["Peak 12–2 PM", "चरम दोपहर 12–2 बजे", "সর্বোচ্চ দুপুর ১২–২টা"],
  ["Peak around 12–2 PM", "चरम दोपहर 12–2 बजे के आसपास", "সর্বোচ্চ দুপুর ১২–২টার কাছাকাছি"],

  // ── Basis lines ─────────────────────────────────────────────────────────────
  [
    "Skin sensitivity + UV / sun",
    "त्वचा संवेदनशीलता + UV / धूप",
    "ত্বকের সংবেদনশীলতা + UV / রোদ",
  ],
  ["UV / sun + Heat", "UV / धूप + गर्मी", "UV / রোদ + গরম"],
  ["AQI / smoke sensitivity", "AQI / धुएँ की संवेदनशीलता", "AQI / ধোঁয়ার সংবেদনশীলতা"],
  ["Cold sensitivity", "ठंड की संवेदनशीलता", "ঠান্ডার সংবেদনশীলতা"],
  ["Today’s Kolkata conditions", "आज कोलकाता की स्थिति", "আজ কলকাতার অবস্থা"],

  // ── Factor & tile labels ────────────────────────────────────────────────────
  ["Air quality", "वायु गुणवत्ता", "বায়ুর মান"],
  ["Comfort", "आराम", "স্বাচ্ছন্দ্য"],
  ["Pollution", "प्रदूषण", "দূষণ"],
  ["Exposure", "जोखिम", "সংস্পর্শ"],
  ["Outdoor risk", "बाहरी जोखिम", "বাইরের ঝুঁকি"],
  ["Safer window", "सुरक्षित समय", "নিরাপদ সময়"],
  ["Skin & Sun", "त्वचा और धूप", "ত্বক ও রোদ"],
  ["Sun protection", "धूप से बचाव", "রোদ-সুরক্ষা"],
  ["UV & Heat", "UV और गर्मी", "UV ও গরম"],
  ["Golden hour", "स्वर्णिम घंटा", "গোল্ডেন আওয়ার"],
  ["Extra layer", "अतिरिक्त परत", "বাড়তি আস্তরণ"],
  ["Indoor", "घर के अंदर", "ঘরের ভিতরে"],
  ["Outdoor", "बाहर", "বাইরে"],
  ["Morning", "सुबह", "সকাল"],
  ["Day", "दिन", "দিন"],
  ["Evening", "शाम", "সন্ধ্যা"],
  ["Night", "रात", "রাত"],
  ["Elevated", "बढ़ा हुआ", "বর্ধিত"],
  ["Unhealthy conditions", "अस्वास्थ्यकर स्थिति", "অস্বাস্থ্যকর অবস্থা"],
  ["PM2.5 elevated", "PM2.5 बढ़ा हुआ", "PM2.5 বর্ধিত"],
  ["Lower UV", "कम UV", "কম UV"],
  ["Cooling gradually", "धीरे-धीरे ठंडक", "ধীরে ধীরে ঠান্ডা"],
  ["Comfortable by afternoon", "दोपहर तक आरामदायक", "বিকেলের মধ্যে আরামদায়ক"],
  ["Cloudy evening light", "शाम की धुँधली रोशनी", "সন্ধ্যার মেঘলা আলো"],
  ["Steady through the day", "दिन भर स्थिर", "সারাদিন স্থিতিশীল"],
  ["Humidity rises later", "बाद में उमस बढ़ेगी", "পরে আর্দ্রতা বাড়বে"],
  ["Heat stress · Moderate", "ताप तनाव · मध्यम", "তাপ-চাপ · মাঝারি"],
  ["164 · Elevated", "164 · बढ़ा हुआ", "১৬৪ · বর্ধিত"],
  ["8 · High", "8 · अधिक", "৮ · বেশি"],
  ["8 · Very High", "8 · बहुत अधिक", "৮ · খুব বেশি"],
  ["8 · Very high", "8 · बहुत अधिक", "৮ · খুব বেশি"],
  ["UV 8 · High", "UV 8 · अधिक", "UV ৮ · বেশি"],
  ["68% chance", "68% संभावना", "৬৮% সম্ভাবনা"],
  ["19°C this morning", "आज सुबह 19°C", "আজ সকালে ১৯°C"],
  ["21°C after sunset", "सूर्यास्त के बाद 21°C", "সূর্যাস্তের পর ২১°C"],
  ["27°C peak", "चरम 27°C", "সর্বোচ্চ ২৭°C"],
  ["Feels like 35°C", "35°C जैसा महसूस", "৩৫°C-এর মতো অনুভূত"],
  ["Feels like 36°C", "36°C जैसा महसूस", "৩৬°C-এর মতো অনুভূত"],
  ["Sunrise 5:42 AM", "सूर्योदय सुबह 5:42", "সূর্যোদয় ভোর ৫:৪২"],
  ["Sunset 6:14 PM", "सूर्यास्त शाम 6:14", "সূর্যাস্ত সন্ধ্যা ৬:১৪"],

  // ── Tile details ────────────────────────────────────────────────────────────
  ["Extra care around midday", "दोपहर में अतिरिक्त सावधानी", "দুপুরে বাড়তি যত্ন"],
  ["Strongest UV period", "सबसे तेज़ UV का समय", "সবচেয়ে প্রবল UV-র সময়"],
  ["Or return after 5 PM", "या शाम 5 बजे के बाद लौटें", "অথবা বিকেল ৫টার পরে ফিরুন"],
  ["Or early this morning", "या आज सुबह जल्दी", "অথবা আজ ভোরের দিকে"],
  ["Exposure eases near sunset", "सूर्यास्त के करीब जोखिम घटता है", "সূর্যাস্তের কাছাকাছি সংস্পর্শ কমে"],
  ["Peak exposure at midday", "दोपहर में सर्वाधिक जोखिम", "দুপুরে সর্বোচ্চ সংস্পর্শ"],
  ["Main air-quality factor", "मुख्य वायु-गुणवत्ता कारक", "প্রধান বায়ুমান উপাদান"],
  ["Especially this afternoon", "ख़ासकर आज दोपहर", "বিশেষত আজ বিকেলে"],
  ["Conditions may begin easing", "स्थिति सुधरनी शुरू हो सकती है", "পরিস্থিতি উন্নত হতে শুরু করতে পারে"],
  ["Coolest part of the day", "दिन का सबसे ठंडा समय", "দিনের সবচেয়ে ঠান্ডা সময়"],
  ["Plan around this window", "इसी समय के अनुसार योजना बनाएँ", "এই সময়টা ধরেই পরিকল্পনা করুন"],
  ["Useful early and late", "सुबह जल्दी और देर शाम उपयोगी", "ভোরে ও রাতে কাজে লাগবে"],
  ["Expect a cooler return home", "लौटते समय ठंडक की उम्मीद रखें", "ফেরার সময় ঠান্ডা লাগবে"],
  ["Expect a more humid afternoon", "दोपहर में अधिक उमस की उम्मीद", "বিকেলে বেশি আর্দ্রতা আশা করুন"],

  // ── Recommendations ─────────────────────────────────────────────────────────
  [
    "Finish outdoor plans before 9 AM",
    "बाहरी योजनाएँ सुबह 9 बजे से पहले पूरी करें",
    "বাইরের কাজ সকাল ৯টার আগে সেরে ফেলুন",
  ],
  [
    "UV exposure rises quickly later in the morning.",
    "सुबह के बाद UV तेज़ी से बढ़ता है।",
    "সকাল গড়ালে UV দ্রুত বাড়ে।",
  ],
  ["Keep sun protection nearby", "धूप से बचाव पास रखें", "রোদ-সুরক্ষা কাছে রাখুন"],
  [
    "Midday UV is the strongest factor in your briefing.",
    "आपकी ब्रीफ़िंग में दोपहर का UV सबसे बड़ा कारक है।",
    "আপনার ব্রিফিংয়ে দুপুরের UV-ই সবচেয়ে বড় উপাদান।",
  ],
  [
    "Choose the evening for a longer walk",
    "लंबी सैर के लिए शाम चुनें",
    "লম্বা হাঁটার জন্য সন্ধ্যা বেছে নিন",
  ],
  [
    "Exposure falls and conditions feel calmer after 5 PM.",
    "शाम 5 बजे के बाद जोखिम घटता है और स्थिति शांत लगती है।",
    "বিকেল ৫টার পরে সংস্পর্শ কমে ও পরিস্থিতি শান্ত লাগে।",
  ],
  ["Go for your walk before 9:30 AM", "सुबह 9:30 से पहले सैर कर लें", "সকাল ৯:৩০-এর আগে হাঁটতে বেরোন"],
  [
    "UV and heat will increase after that.",
    "उसके बाद UV और गर्मी दोनों बढ़ेंगे।",
    "তারপরে UV ও গরম দুটোই বাড়বে।",
  ],
  ["Keep the afternoon lighter", "दोपहर को हल्का रखें", "বিকেলটা হালকা রাখুন"],
  [
    "It may feel close to 36°C at peak heat.",
    "सबसे अधिक गर्मी में यह 36°C जैसा लग सकता है।",
    "সর্বোচ্চ গরমে এটি ৩৬°C-এর মতো লাগতে পারে।",
  ],
  [
    "Evening is your second-best window",
    "शाम आपका दूसरा सबसे अच्छा समय है",
    "সন্ধ্যা আপনার দ্বিতীয় সেরা সময়",
  ],
  [
    "Sun and heat both ease after 5 PM.",
    "शाम 5 बजे के बाद धूप और गर्मी दोनों घटती हैं।",
    "বিকেল ৫টার পরে রোদ ও গরম দুটোই কমে।",
  ],
  ["Use the golden-hour window", "स्वर्णिम घंटे का उपयोग करें", "গোল্ডেন আওয়ার কাজে লাগান"],
  [
    "5:30–6:15 PM offers gentler outdoor light.",
    "शाम 5:30–6:15 में बाहर की रोशनी नरम रहती है।",
    "বিকেল ৫:৩০–৬:১৫-এ বাইরের আলো অনেক নরম।",
  ],
  ["Plan protection for midday", "दोपहर के लिए बचाव की योजना बनाएँ", "দুপুরের জন্য সুরক্ষার পরিকল্পনা করুন"],
  [
    "UV is expected to reach very high levels.",
    "UV के बहुत अधिक स्तर तक पहुँचने की आशंका है।",
    "UV খুব বেশি মাত্রায় পৌঁছাতে পারে।",
  ],
  [
    "Use 8–11 AM for outdoor plans",
    "बाहरी योजनाओं के लिए सुबह 8–11 बजे का समय चुनें",
    "বাইরের কাজের জন্য সকাল ৮–১১টা বেছে নিন",
  ],
  [
    "Use 10 AM–5 PM for outdoor plans",
    "बाहरी योजनाओं के लिए सुबह 10 से शाम 5 बजे का समय चुनें",
    "বাইরের কাজের জন্য সকাল ১০টা–বিকেল ৫টা বেছে নিন",
  ],
  [
    "Sunlight softens as the peak UV window ends.",
    "चरम UV का समय बीतते ही धूप नरम पड़ जाती है।",
    "সর্বোচ্চ UV-র সময় শেষ হলে রোদ নরম হয়ে আসে।",
  ],
  [
    "It is the best overall balance of heat and rain.",
    "गर्मी और वर्षा के बीच यही सबसे अच्छा संतुलन है।",
    "গরম ও বৃষ্টির মধ্যে এটাই সেরা ভারসাম্য।",
  ],
  [
    "That is the most comfortable temperature window.",
    "तापमान के लिहाज़ से यही सबसे आरामदायक समय है।",
    "তাপমাত্রার হিসেবে এটাই সবচেয়ে আরামদায়ক সময়।",
  ],
  [
    "That is the better potential outdoor window.",
    "बाहर निकलने के लिए यही बेहतर संभावित समय है।",
    "বাইরে যাওয়ার জন্য এটাই সম্ভাব্য ভালো সময়।",
  ],
  ["Move exercise indoors today", "आज व्यायाम घर के अंदर करें", "আজ ব্যায়াম ঘরের ভিতরে করুন"],
  [
    "AQI and PM2.5 are elevated through the afternoon.",
    "दोपहर भर AQI और PM2.5 बढ़े हुए रहते हैं।",
    "বিকেল পর্যন্ত AQI ও PM2.5 বর্ধিত থাকে।",
  ],
  ["Keep outdoor exposure shorter", "बाहर बिताया समय कम रखें", "বাইরে থাকার সময় কমিয়ে রাখুন"],
  ["Recheck conditions after 7 PM", "शाम 7 बजे के बाद स्थिति फिर देखें", "সন্ধ্যা ৭টার পরে অবস্থা আবার দেখুন"],
  ["Carry a light extra layer", "एक हल्की अतिरिक्त परत साथ रखें", "হালকা একটি বাড়তি আস্তরণ সঙ্গে রাখুন"],
  [
    "Early morning and evening will feel noticeably cooler.",
    "सुबह जल्दी और शाम में ठंडक साफ़ महसूस होगी।",
    "ভোরে ও সন্ধ্যায় বেশ ঠান্ডা লাগবে।",
  ],
  ["Move longer plans toward 5 PM", "लंबी योजनाएँ शाम 5 बजे की ओर खिसकाएँ", "লম্বা পরিকল্পনা বিকেল ৫টার দিকে সরান"],
  [
    "Temperatures fall toward 21°C after sunset.",
    "सूर्यास्त के बाद तापमान 21°C की ओर गिरता है।",
    "সূর্যাস্তের পরে তাপমাত্রা ২১°C-র দিকে নামে।",
  ],
  ["Keep an umbrella nearby", "छाता पास रखें", "ছাতা কাছে রাখুন"],
  [
    "Rain probability rises after 4 PM.",
    "शाम 4 बजे के बाद वर्षा की संभावना बढ़ती है।",
    "বিকেল ৪টার পরে বৃষ্টির সম্ভাবনা বাড়ে।",
  ],
  [
    "It may feel warmer even if temperature holds steady.",
    "तापमान स्थिर रहने पर भी अधिक गर्मी महसूस हो सकती है।",
    "তাপমাত্রা একই থাকলেও বেশি গরম লাগতে পারে।",
  ],

  // ── Disclaimers ─────────────────────────────────────────────────────────────
  [
    "Weather guidance only — not medical advice.",
    "केवल मौसम संबंधी मार्गदर्शन — चिकित्सकीय सलाह नहीं।",
    "শুধুমাত্র আবহাওয়া সংক্রান্ত দিকনির্দেশ — চিকিৎসা পরামর্শ নয়।",
  ],
  [
    "This is environmental guidance, not a medical diagnosis.",
    "यह पर्यावरण संबंधी मार्गदर्शन है, चिकित्सकीय निदान नहीं।",
    "এটি পরিবেশ সংক্রান্ত দিকনির্দেশ, চিকিৎসা নির্ণয় নয়।",
  ],
]
