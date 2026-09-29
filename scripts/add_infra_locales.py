import json
import os

LOCALES_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "lib", "i18n", "locales")

STATUSES_MAP = {
    "en": {
        "CLASSIFIED_INFRASTRUCTURE": "Infrastructure Development",
        "INFRASTRUCTURE_REVIEW": "Under Infrastructure Review",
        "INFRASTRUCTURE_ACCEPTED": "Infrastructure Passed",
        "INFRASTRUCTURE_DEFERRED": "Infrastructure Deferred",
        "INFRASTRUCTURE_REJECTED": "Infrastructure Not Passed"
    },
    "hi": {
        "CLASSIFIED_INFRASTRUCTURE": "बुनियादी ढांचा विकास",
        "INFRASTRUCTURE_REVIEW": "बुनियादी ढांचा समीक्षाधीन",
        "INFRASTRUCTURE_ACCEPTED": "बुनियादी ढांचा स्वीकृत",
        "INFRASTRUCTURE_DEFERRED": "बुनियादी ढांचा स्थगित",
        "INFRASTRUCTURE_REJECTED": "बुनियादी ढांचा अस्वीकृत"
    },
    "mr": {
        "CLASSIFIED_INFRASTRUCTURE": "पायाभूत सुविधा विकास",
        "INFRASTRUCTURE_REVIEW": "पायाभूत सुविधा पुनरावलोकन",
        "INFRASTRUCTURE_ACCEPTED": "पायाभूत सुविधा मंजूर",
        "INFRASTRUCTURE_DEFERRED": "पायाभूत सुविधा स्थगित",
        "INFRASTRUCTURE_REJECTED": "पायाभूत सुविधा नामंजूर"
    },
    "bn": {
        "CLASSIFIED_INFRASTRUCTURE": "অবকাঠামো উন্নয়ন",
        "INFRASTRUCTURE_REVIEW": "অবকাঠামো পর্যালোচনাধীন",
        "INFRASTRUCTURE_ACCEPTED": "অবকাঠামো অনুমোদিত",
        "INFRASTRUCTURE_DEFERRED": "অবকাঠামো স্থগিত",
        "INFRASTRUCTURE_REJECTED": "অবকাঠামো প্রত্যাখ্যাত"
    },
    "gu": {
        "CLASSIFIED_INFRASTRUCTURE": "ઇન્ફ્રાસ્ટ્રક્ચર વિકાસ",
        "INFRASTRUCTURE_REVIEW": "ઇન્ફ્રાસ્ટ્રક્ચર સમીક્ષા હેઠળ",
        "INFRASTRUCTURE_ACCEPTED": "ઇન્ફ્રાસ્ટ્રક્ચર મંજૂર",
        "INFRASTRUCTURE_DEFERRED": "ઇન્ફ્રાસ્ટ્રક્ચર મુલતવી",
        "INFRASTRUCTURE_REJECTED": "ઇન્ફ્રાસ્ટ્રક્ચર નામંજૂર"
    },
    "pa": {
        "CLASSIFIED_INFRASTRUCTURE": "ਬੁਨਿਆਦੀ ਢਾਂਚਾ ਵਿਕਾਸ",
        "INFRASTRUCTURE_REVIEW": "ਬੁਨਿਆਦੀ ਢਾਂਚਾ ਸਮੀਖਿਆ ਅਧੀਨ",
        "INFRASTRUCTURE_ACCEPTED": "ਬੁਨਿਆਦੀ ਢਾਂਚਾ ਪਾਸ",
        "INFRASTRUCTURE_DEFERRED": "ਬੁਨਿਆਦੀ ਢਾਂਚਾ ਮੁਲਤਵੀ",
        "INFRASTRUCTURE_REJECTED": "ਬੁਨਿਆਦੀ ਢਾਂਚਾ ਰੱਦ"
    },
    "ta": {
        "CLASSIFIED_INFRASTRUCTURE": "கட்டமைப்பு மேம்பாடு",
        "INFRASTRUCTURE_REVIEW": "கட்டமைப்பு மறுஆய்வில்",
        "INFRASTRUCTURE_ACCEPTED": "கட்டமைப்பு அங்கீகரிக்கப்பட்டது",
        "INFRASTRUCTURE_DEFERRED": "கட்டமைப்பு ஒத்திவைக்கப்பட்டது",
        "INFRASTRUCTURE_REJECTED": "கட்டமைப்பு நிராகரிக்கப்பட்டது"
    },
    "te": {
        "CLASSIFIED_INFRASTRUCTURE": "మౌలిక సదుపాయాల అభివృద్ధి",
        "INFRASTRUCTURE_REVIEW": "మౌలిక సదుపాయాల సమీక్షలో ఉంది",
        "INFRASTRUCTURE_ACCEPTED": "మౌలిక సదుపాయాలు ఆమోదించబడ్డాయి",
        "INFRASTRUCTURE_DEFERRED": "మౌలిక సదుపాయాలు వాయిదా వేయబడ్డాయి",
        "INFRASTRUCTURE_REJECTED": "మౌలిక సదుపాయాలు తిరస్కరించబడ్డాయి"
    },
    "kn": {
        "CLASSIFIED_INFRASTRUCTURE": "ಮೂಲಸೌಕರ್ಯ ಅಭಿವೃದ್ಧಿ",
        "INFRASTRUCTURE_REVIEW": "ಮೂಲಸೌಕರ್ಯ ಪರಿಶೀಲನೆಯಲ್ಲಿದೆ",
        "INFRASTRUCTURE_ACCEPTED": "ಮೂಲಸೌಕರ್ಯ ಅನುಮೋದಿಸಲಾಗಿದೆ",
        "INFRASTRUCTURE_DEFERRED": "ಮೂಲಸೌಕರ್ಯ ಮುಂದೂಡಲಾಗಿದೆ",
        "INFRASTRUCTURE_REJECTED": "ಮೂಲಸೌಕರ್ಯ ತಿರಸ್ಕರಿಸಲಾಗಿದೆ"
    },
    "ml": {
        "CLASSIFIED_INFRASTRUCTURE": "അടിസ്ഥാന സൗകര്യ വികസനം",
        "INFRASTRUCTURE_REVIEW": "അടിസ്ഥാന സൗകര്യ പുനരവലോകനത്തിൽ",
        "INFRASTRUCTURE_ACCEPTED": "അടിസ്ഥാന സൗകര്യം അംഗീകരിച്ചു",
        "INFRASTRUCTURE_DEFERRED": "അടിസ്ഥാന സൗകര്യം മാറ്റിവച്ചു",
        "INFRASTRUCTURE_REJECTED": "അടിസ്ഥാന സൗകര്യം നിരസിച്ചു"
    },
    "or": {
        "CLASSIFIED_INFRASTRUCTURE": "ଭିତ୍ତିଭୂମି ବିକାଶ",
        "INFRASTRUCTURE_REVIEW": "ଭିତ୍ତିଭୂମି ସମୀକ୍ଷାଧୀନ",
        "INFRASTRUCTURE_ACCEPTED": "ଭିତ୍ତିଭୂମି ଅନୁମୋଦିତ",
        "INFRASTRUCTURE_DEFERRED": "ଭିତ୍ତିଭୂମି ସ୍ଥଗିତ",
        "INFRASTRUCTURE_REJECTED": "ଭିତ୍ତିଭୂମି ପ୍ରତ୍ୟାଖ୍ୟାତ"
    },
    "as": {
        "CLASSIFIED_INFRASTRUCTURE": "আন্তঃগাঁথনি বিকাশ",
        "INFRASTRUCTURE_REVIEW": "আন্তঃগাঁথনি পৰ্যালোচনাধীন",
        "INFRASTRUCTURE_ACCEPTED": "আন্তঃগাঁথনি অনুমোদিত",
        "INFRASTRUCTURE_DEFERRED": "আন্তঃগাঁথনি স্থগিত",
        "INFRASTRUCTURE_REJECTED": "আন্তঃগাঁথনি নাকচ"
    },
    "ur": {
        "CLASSIFIED_INFRASTRUCTURE": "بنیادی ڈھانچے کی ترقی",
        "INFRASTRUCTURE_REVIEW": "بنیادی ڈھانچے کا جائزہ زیر غور",
        "INFRASTRUCTURE_ACCEPTED": "بنیادی ڈھانچہ منظور شدہ",
        "INFRASTRUCTURE_DEFERRED": "بنیادی ڈھانچہ موخر",
        "INFRASTRUCTURE_REJECTED": "بنیادی ڈھانچہ مسترد"
    },
    "sa": {
        "CLASSIFIED_INFRASTRUCTURE": "मूलसंरचनाविकासः",
        "INFRASTRUCTURE_REVIEW": "मूलसंरचनासमीक्षाधीनम्",
        "INFRASTRUCTURE_ACCEPTED": "मूलसंरचना स्वीकृतम्",
        "INFRASTRUCTURE_DEFERRED": "मूलसंरचना स्थगितम्",
        "INFRASTRUCTURE_REJECTED": "मूलसंरचना अस्वीकृतम्"
    },
    "ne": {
        "CLASSIFIED_INFRASTRUCTURE": "पूर्वाधार विकास",
        "INFRASTRUCTURE_REVIEW": "पूर्वाधार समीक्षाधीन",
        "INFRASTRUCTURE_ACCEPTED": "पूर्वाधार स्वीकृत",
        "INFRASTRUCTURE_DEFERRED": "पूर्वाधार स्थगित",
        "INFRASTRUCTURE_REJECTED": "पूर्वाधार अस्वीकृत"
    },
    "kok": {
        "CLASSIFIED_INFRASTRUCTURE": "बुन्यादी सुविधा विकास",
        "INFRASTRUCTURE_REVIEW": "बुन्यादी सुविधा नियाळणी खाला",
        "INFRASTRUCTURE_ACCEPTED": "बुन्यादी सुविधा मंजूर",
        "INFRASTRUCTURE_DEFERRED": "बुन्यादी सुविधा मुखार धुकलल्या",
        "INFRASTRUCTURE_REJECTED": "बुन्यादी सुविधा न्हयकारल्या"
    },
    "ks": {
        "CLASSIFIED_INFRASTRUCTURE": "بنیادی ڈھانچہ ترقی",
        "INFRASTRUCTURE_REVIEW": "بنیادی ڈھانچہ جائزہ تحت",
        "INFRASTRUCTURE_ACCEPTED": "بنیادی ڈھانچہ منظور",
        "INFRASTRUCTURE_DEFERRED": "بنیادی ڈھانچہ التوا منز",
        "INFRASTRUCTURE_REJECTED": "بنیادی ڈھانچہ مسترد"
    },
    "sd": {
        "CLASSIFIED_INFRASTRUCTURE": "بنيادي ڍانچي جي ترقي",
        "INFRASTRUCTURE_REVIEW": "بنيادي ڍانچي جي نظرثاني هيٺ",
        "INFRASTRUCTURE_ACCEPTED": "بنيادي ڍانچو منظور",
        "INFRASTRUCTURE_DEFERRED": "بنيادي ڍانچو ملتوي",
        "INFRASTRUCTURE_REJECTED": "بنيادي ڍانچو رد"
    },
    "mai": {
        "CLASSIFIED_INFRASTRUCTURE": "मूलभूत संरचना विकास",
        "INFRASTRUCTURE_REVIEW": "मूलभूत संरचना समीक्षाधीन",
        "INFRASTRUCTURE_ACCEPTED": "मूलभूत संरचना स्वीकृत",
        "INFRASTRUCTURE_DEFERRED": "मूलभूत संरचना स्थगित",
        "INFRASTRUCTURE_REJECTED": "मूलभूत संरचना अस्वीकृत"
    },
    "mni": {
        "CLASSIFIED_INFRASTRUCTURE": "য়ুমফম থোইদোকপা চাউখৎ-থৌরাং",
        "INFRASTRUCTURE_REVIEW": "য়ুমফম অমুক হন্না য়েংশিনবা মনুংদা",
        "INFRASTRUCTURE_ACCEPTED": "য়ুমফম য়ানবা য়ারে",
        "INFRASTRUCTURE_DEFERRED": "য়ুমফম লোইথোকপা",
        "INFRASTRUCTURE_REJECTED": "য়ুমফম য়াদবা"
    }
}

INFRA_TEXTS_MAP = {
    "en": {
        "tag": "Infrastructure Development Track",
        "reviewTitle": "Infrastructure Assessment in Progress",
        "reviewDescription": "This issue has been classified for capital infrastructure assessment and is currently undergoing administrative screening using district baseline data and sectoral planning baselines.",
        "reviewNotice": "An authorized platform administrator is evaluating this request against district planning priorities. You will see the official screening outcome here once recorded.",
        "passedTitle": "Infrastructure Screening Passed",
        "passedSubtitle": "This infrastructure request has successfully passed administrative screening.",
        "notPassedTitle": "Infrastructure Screening Not Passed",
        "notPassedSubtitle": "This infrastructure request did not pass administrative screening for the current cycle.",
        "passedBadge": "Passed",
        "notPassedBadge": "Not Passed",
        "officialSummaryLabel": "Official Administrative Summary",
        "decisionDateLabel": "Decision Recorded On",
        "resultingStatusLabel": "Resulting Status",
        "statusExplanationLabel": "What this status means",
        "passedExplanation": "The project request meets preliminary district planning criteria and has been accepted into the capital infrastructure pipeline.",
        "notPassedExplanation": "The project request does not meet current planning or feasibility thresholds and will not advance to the capital works pipeline at this time.",
        "disclaimer": "This is an official administrative screening decision recorded by an authorized CivicFix administrator."
    },
    "hi": {
        "tag": "बुनियादी ढांचा विकास ट्रैक",
        "reviewTitle": "बुनियादी ढांचा मूल्यांकन प्रगति पर है",
        "reviewDescription": "इस समस्या को पूंजीगत बुनियादी ढांचा मूल्यांकन के लिए वर्गीकृत किया गया है और वर्तमान में जिला डेटा और योजना मानदंडों का उपयोग करके प्रशासनिक जांच की जा रही है।",
        "reviewNotice": "एक अधिकृत व्यवस्थापक जिला योजना प्राथमिकताओं के आधार पर इस अनुरोध का मूल्यांकन कर रहा है। निर्णय दर्ज होने पर आपको यहां परिणाम दिखाई देगा।",
        "passedTitle": "बुनियादी ढांचा जांच स्वीकृत",
        "passedSubtitle": "यह बुनियादी ढांचा अनुरोध प्रशासनिक जांच में सफलतापूर्वक उत्तीर्ण हो गया है।",
        "notPassedTitle": "बुनियादी ढांचा जांच अस्वीकृत",
        "notPassedSubtitle": "यह बुनियादी ढांचा अनुरोध वर्तमान चक्र के लिए प्रशासनिक जांच में उत्तीर्ण नहीं हुआ।",
        "passedBadge": "स्वीकृत",
        "notPassedBadge": "अस्वीकृत",
        "officialSummaryLabel": "आधिकारिक प्रशासनिक सारांश",
        "decisionDateLabel": "निर्णय दर्ज करने की तिथि",
        "resultingStatusLabel": "परिणामी स्थिति",
        "statusExplanationLabel": "इस स्थिति का क्या अर्थ है",
        "passedExplanation": "परियोजना अनुरोध प्रारंभिक जिला योजना मानदंडों को पूरा करता है और इसे पूंजीगत बुनियादी ढांचा पाइपलाइन में शामिल कर लिया गया है।",
        "notPassedExplanation": "परियोजना अनुरोध वर्तमान योजना या व्यवहार्यता सीमाओं को पूरा नहीं करता है और इस समय आगे नहीं बढ़ेगा।",
        "disclaimer": "यह एक अधिकृत CivicFix व्यवस्थापक द्वारा दर्ज किया गया आधिकारिक प्रशासनिक निर्णय है।"
    },
    "mr": {
        "tag": "पायाभूत सुविधा विकास ट्रॅक",
        "reviewTitle": "पायाभूत सुविधा मूल्यांकन प्रगतीपथावर आहे",
        "reviewDescription": "या समस्येचे भांडवली पायाभूत सुविधा मूल्यांकनासाठी वर्गीकरण केले गेले आहे आणि सध्या जिल्हा डेटा आणि नियोजन निकषांचा वापर करून प्रशासकीय तपासणी सुरू आहे.",
        "reviewNotice": "अधिकृत प्रशासक जिल्हा नियोजन प्राधान्यांच्या आधारे या विनंतीचे मूल्यांकन करत आहेत. निर्णय नोंदवल्यावर तुम्हाला येथे निकाल दिसेल.",
        "passedTitle": "पायाभूत सुविधा तपासणी मंजूर",
        "passedSubtitle": "ही पायाभूत सुविधा विनंती प्रशासकीय तपासणीत यशस्वीरीत्या उत्तीर्ण झाली आहे.",
        "notPassedTitle": "पायाभूत सुविधा तपासणी नामंजूर",
        "notPassedSubtitle": "ही पायाभूत सुविधा विनंती सध्याच्या चक्रासाठी प्रशासकीय तपासणीत उत्तीर्ण झाली नाही.",
        "passedBadge": "मंजूर",
        "notPassedBadge": "नामंजूर",
        "officialSummaryLabel": "अधिकृत प्रशासकीय सारांश",
        "decisionDateLabel": "निर्णय नोंदवलेली तारीख",
        "resultingStatusLabel": "परिणामी स्थिती",
        "statusExplanationLabel": "या स्थितीचा अर्थ काय आहे",
        "passedExplanation": "प्रकल्प विनंती प्राथमिक जिल्हा नियोजन निकष पूर्ण करते आणि भांडवली पायाभूत सुविधा पाइपलाइनमध्ये समाविष्ट केली गेली आहे.",
        "notPassedExplanation": "प्रकल्प विनंती सध्याच्या नियोजन किंवा व्यवहार्यता मर्यादा पूर्ण करत नाही आणि सध्या पुढे जाणार नाही.",
        "disclaimer": "हा अधिकृत CivicFix प्रशासकाद्वारे नोंदवलेला अधिकृत प्रशासकीय निर्णय आहे."
    },
    "bn": {
        "tag": "অবকাঠামো উন্নয়ন ট্র্যাক",
        "reviewTitle": "অবকাঠামো মূল্যায়ন প্রক্রিয়াধীন",
        "reviewDescription": "এই সমস্যাটিকে মূলধনী অবকাঠামো মূল্যায়নের জন্য শ্রেণীবদ্ধ করা হয়েছে এবং বর্তমানে জেলা ডেটা এবং পরিকল্পনা মানদণ্ড ব্যবহার করে প্রশাসনিক যাচাই চলছে।",
        "reviewNotice": "একজন অনুমোদিত প্রশাসক জেলা পরিকল্পনার অগ্রাধিকার অনুযায়ী এই অনুরোধটি মূল্যায়ন করছেন। সিদ্ধান্ত রেকর্ড হলে আপনি এখানে ফলাফল দেখতে পাবেন।",
        "passedTitle": "অবকাঠামো স্ক্রিনিং উত্তীর্ণ",
        "passedSubtitle": "এই অবকাঠামো অনুরোধটি সফলভাবে প্রশাসনিক যাচাইয়ে উত্তীর্ণ হয়েছে।",
        "notPassedTitle": "অবকাঠামো স্ক্রিনিং অনুত্তীর্ণ",
        "notPassedSubtitle": "এই অবকাঠামো অনুরোধটি বর্তমান চক্রের প্রশাসনিক যাচাইয়ে উত্তীর্ণ হয়নি।",
        "passedBadge": "উত্তীর্ণ",
        "notPassedBadge": "অনুত্তীর্ণ",
        "officialSummaryLabel": "অফিসিয়াল প্রশাসনিক সারসংক্ষেপ",
        "decisionDateLabel": "সিদ্ধান্ত রেকর্ডের তারিখ",
        "resultingStatusLabel": "ফলাফলের স্থিতি",
        "statusExplanationLabel": "এই স্থিতির অর্থ কী",
        "passedExplanation": "প্রকল্পের অনুরোধটি প্রাথমিক জেলা পরিকল্পনার মানদণ্ড পূরণ করে এবং মূলধনী অবকাঠামো পাইপলাইনে গৃহীত হয়েছে।",
        "notPassedExplanation": "প্রকল্পের অনুরোধটি বর্তমান পরিকল্পনা বা সম্ভাব্যতা সীমা পূরণ করে না এবং এই সময়ে অগ্রসর হবে না।",
        "disclaimer": "এটি একজন অনুমোদিত CivicFix প্রশাসক দ্বারা রেকর্ড করা একটি অফিসিয়াল প্রশাসনিক সিদ্ধান্ত।"
    },
    "gu": {
        "tag": "ઇન્ફ્રાસ્ટ્રક્ચર વિકાસ ટ્રેક",
        "reviewTitle": "ઇન્ફ્રાસ્ટ્રક્ચર મૂલ્યાંકન પ્રગતિમાં છે",
        "reviewDescription": "આ સમસ્યાને મૂડી ઇન્ફ્રાસ્ટ્રક્ચર મૂલ્યાંકન માટે વર્ગીકૃત કરવામાં આવી છે અને હાલમાં જિલ્લા ડેટા અને આયોજન માપદંડોનો ઉપયોગ કરીને વહીવટી તપાસ ચાલી રહી છે.",
        "reviewNotice": "એક અધિકૃત વહીવટકર્તા જિલ્લા આયોજન પ્રાથમિકતાઓના આધારે આ વિનંતીનું મૂલ્યાંકન કરી રહ્યા છે. નિર્ણય નોંધાયા પછી તમને અહીં પરિણામ જોવા મળશે.",
        "passedTitle": "ઇન્ફ્રાસ્ટ્રક્ચર સ્ક્રિનિંગ મંજૂર",
        "passedSubtitle": "આ ઇન્ફ્રાસ્ટ્રક્ચર વિનંતી વહીવટી સ્ક્રિનિંગમાં સફળતાપૂર્વક પાસ થઈ ગઈ છે.",
        "notPassedTitle": "ઇન્ફ્રાસ્ટ્રક્ચર સ્ક્રિનિંગ નામંજૂર",
        "notPassedSubtitle": "આ ઇન્ફ્રાસ્ટ્રક્ચર વિનંતી વર્તમાન ચક્ર માટે વહીવટી સ્ક્રિનિંગમાં પાસ થઈ નથી.",
        "passedBadge": "મંજૂર",
        "notPassedBadge": "નામંજૂર",
        "officialSummaryLabel": "સત્તાવાર વહીવટી સારાંશ",
        "decisionDateLabel": "નિર્ણય નોંધ્યાની તારીખ",
        "resultingStatusLabel": "પરિણામી સ્થિતિ",
        "statusExplanationLabel": "આ સ્થિતિનો અર્થ શું છે",
        "passedExplanation": "પ્રોજેક્ટ વિનંતી પ્રારંભિક જિલ્લા આયોજન માપદંડોને પૂર્ણ કરે છે અને મૂડી ઇન્ફ્રાસ્ટ્રક્ચર પાઇપલાઇનમાં સ્વીકારવામાં આવી છે.",
        "notPassedExplanation": "પ્રોજેક્ટ વિનંતી વર્તમાન આયોજન અથવા શક્યતા મર્યાદાઓને પૂર્ણ કરતી નથી અને હાલમાં આગળ વધશે નહીં.",
        "disclaimer": "આ અધિકૃત CivicFix એડમિનિસ્ટ્રેટર દ્વારા રેકોર્ડ કરાયેલ સત્તાવાર વહીવટી નિર્ણય છે."
    },
    "pa": {
        "tag": "ਬੁਨਿਆਦੀ ਢਾਂਚਾ ਵਿਕਾਸ ਟਰੈਕ",
        "reviewTitle": "ਬੁਨਿਆਦੀ ਢਾਂਚਾ ਮੁਲਾਂਕਣ ਜਾਰੀ ਹੈ",
        "reviewDescription": "ਇਸ ਮੁੱਦੇ ਨੂੰ ਪੂੰਜੀਗਤ ਬੁਨਿਆਦੀ ਢਾਂਚੇ ਦੇ ਮੁਲਾਂਕਣ ਲਈ ਵਰਗੀਕ੍ਰਿਤ ਕੀਤਾ ਗਿਆ ਹੈ ਅਤੇ ਜ਼ਿਲ੍ਹਾ ਡੇਟਾ ਅਤੇ ਯੋਜਨਾਬੰਦੀ ਮਾਪਦੰਡਾਂ ਦੀ ਵਰਤੋਂ ਕਰਕੇ ਪ੍ਰਸ਼ਾਸਕੀ ਜਾਂਚ ਕੀਤੀ ਜਾ ਰਹੀ ਹੈ।",
        "reviewNotice": "ਇੱਕ ਅਧਿਕਾਰਤ ਪ੍ਰਸ਼ਾਸਕ ਜ਼ਿਲ੍ਹਾ ਯੋਜਨਾਬੰਦੀ ਤਰਜੀਹਾਂ ਦੇ ਆਧਾਰ 'ਤੇ ਇਸ ਬੇਨਤੀ ਦਾ ਮੁਲਾਂਕਣ ਕਰ ਰਿਹਾ ਹੈ। ਫੈਸਲਾ ਦਰਜ ਹੋਣ ਤੋਂ ਬਾਅਦ ਤੁਹਾਨੂੰ ਇੱਥੇ ਨਤੀਜਾ ਦਿਖਾਈ ਦੇਵੇਗਾ।",
        "passedTitle": "ਬੁਨਿਆਦੀ ਢਾਂਚਾ ਜਾਂਚ ਪਾਸ",
        "passedSubtitle": "ਇਹ ਬੁਨਿਆਦੀ ਢਾਂਚਾ ਬੇਨਤੀ ਪ੍ਰਸ਼ਾਸਕੀ ਜਾਂਚ ਵਿੱਚ ਸਫਲਤਾਪੂਰਵਕ ਪਾਸ ਹੋ ਗਈ ਹੈ।",
        "notPassedTitle": "ਬੁਨਿਆਦੀ ਢਾਂਚਾ ਜਾਂਚ ਰੱਦ",
        "notPassedSubtitle": "ਇਹ ਬੁਨਿਆਦੀ ਢਾਂਚਾ ਬੇਨਤੀ ਮੌਜੂਦਾ ਚੱਕਰ ਲਈ ਪ੍ਰਸ਼ਾਸਕੀ ਜਾਂਚ ਵਿੱਚ ਪਾਸ ਨਹੀਂ ਹੋਈ।",
        "passedBadge": "ਪਾਸ",
        "notPassedBadge": "ਰੱਦ",
        "officialSummaryLabel": "ਸਰਕਾਰੀ ਪ੍ਰਸ਼ਾਸਕੀ ਸੰਖੇਪ",
        "decisionDateLabel": "ਫੈਸਲਾ ਦਰਜ ਕਰਨ ਦੀ ਮਿਤੀ",
        "resultingStatusLabel": "ਨਤੀਜਾ ਸਥਿਤੀ",
        "statusExplanationLabel": "ਇਸ ਸਥਿਤੀ ਦਾ ਕੀ ਅਰਥ ਹੈ",
        "passedExplanation": "ਪ੍ਰੋਜੈਕਟ ਬੇਨਤੀ ਸ਼ੁਰੂਆਤੀ ਜ਼ਿਲ੍ਹਾ ਯੋਜਨਾਬੰਦੀ ਮਾਪਦੰਡਾਂ ਨੂੰ ਪੂਰਾ ਕਰਦੀ ਹੈ ਅਤੇ ਪੂੰਜੀਗਤ ਬੁਨਿਆਦੀ ਢਾਂਚੇ ਦੀ ਪਾਈਪਲਾਈਨ ਵਿੱਚ ਸਵੀਕਾਰ ਕਰ ਲਈ ਗਈ ਹੈ।",
        "notPassedExplanation": "ਪ੍ਰੋਜੈਕਟ ਬੇਨਤੀ ਮੌਜੂਦਾ ਯੋਜਨਾਬੰਦੀ ਜਾਂ ਸੰਭਾਵਨਾ ਦੀਆਂ ਹੱਦਾਂ ਨੂੰ ਪੂਰਾ ਨਹੀਂ ਕਰਦੀ ਅਤੇ ਇਸ ਸਮੇਂ ਅੱਗੇ ਨਹੀਂ ਵਧੇਗੀ।",
        "disclaimer": "ਇਹ ਇੱਕ ਅਧਿਕਾਰਤ CivicFix ਪ੍ਰਸ਼ਾਸਕ ਦੁਆਰਾ ਦਰਜ ਕੀਤਾ ਗਿਆ ਅਧਿਕਾਰਤ ਪ੍ਰਸ਼ਾਸਕੀ ਫੈਸਲਾ ਹੈ।"
    },
    "ta": {
        "tag": "கட்டமைப்பு மேம்பாட்டுப் பிரிவு",
        "reviewTitle": "கட்டமைப்பு மதிப்பீடு நடைபெறுகிறது",
        "reviewDescription": "இந்தச் சிக்கல் மூலதனக் கட்டமைப்பு மதிப்பீட்டிற்காக வகைப்படுத்தப்பட்டுள்ளது, மேலும் மாவட்டத் தரவு மற்றும் திட்டமிடல் அடிப்படைகளைப் பயன்படுத்தி நிர்வாக ஆய்வு நடைபெறுகிறது.",
        "reviewNotice": "அங்கீகரிக்கப்பட்ட நிர்வாகி மாவட்ட திட்டமிடல் முன்னுரிமைகளின் அடிப்படையில் இந்த கோரிக்கையை மதிப்பிடுகிறார். முடிவு பதிவு செய்யப்பட்டவுடன் இங்கு காண்பிக்கப்படும்.",
        "passedTitle": "கட்டமைப்பு ஆய்வு தேர்ச்சி பெற்றது",
        "passedSubtitle": "இந்த கட்டமைப்பு கோரிக்கை நிர்வாக ஆய்வில் வெற்றிகரமாக தேர்ச்சி பெற்றுள்ளது.",
        "notPassedTitle": "கட்டமைப்பு ஆய்வு தேர்ச்சி பெறவில்லை",
        "notPassedSubtitle": "இந்த கட்டமைப்பு கோரிக்கை தற்போதைய சுழற்சிக்கான நிர்வாக ஆய்வில் தேர்ச்சி பெறவில்லை.",
        "passedBadge": "தேர்ச்சி",
        "notPassedBadge": "நிராகரிப்பு",
        "officialSummaryLabel": "அதிகாரப்பூர்வ நிர்வாக சுருக்கம்",
        "decisionDateLabel": "முடிவு பதிவு செய்யப்பட்ட தேதி",
        "resultingStatusLabel": "விளைவு நிலை",
        "statusExplanationLabel": "இந்த நிலையின் அர்த்தம் என்ன",
        "passedExplanation": "திட்டக் கோரிக்கை ஆரம்ப மாவட்ட திட்டமிடல் அளவுகோல்களை பூர்த்தி செய்து மூலதன கட்டமைப்பு பைப்லைனில் ஏற்றுக்கொள்ளப்பட்டது.",
        "notPassedExplanation": "திட்டக் கோரிக்கை தற்போதைய திட்டமிடல் அல்லது சாத்தியக்கூறு வரம்புகளை பூர்த்தி செய்யவில்லை, எனவே இப்போது முன்னெடுக்கப்படாது.",
        "disclaimer": "இது அங்கீகரிக்கப்பட்ட CivicFix நிர்வாகியால் பதிவு செய்யப்பட்ட அதிகாரப்பூர்வ நிர்வாக முடிவாகும்."
    },
    "te": {
        "tag": "మౌలిక సదుపాయాల అభివృద్ధి విభాగం",
        "reviewTitle": "మౌలిక సదుపాయాల అంచనా పురోగతిలో ఉంది",
        "reviewDescription": "ఈ సమస్య మూలధన మౌలిక సదుపాయాల అంచనా కోసం వర్గీకరించబడింది మరియు ప్రస్తుతం జిల్లా డేటా మరియు ప్రణాళికా ప్రమాణాలను ఉపయోగించి పరిపాలనా పరిశీలన జరుగుతోంది.",
        "reviewNotice": "అధీకృత నిర్వాహకుడు జిల్లా ప్రణాళిక ప్రాధాన్యతలను బట్టి ఈ అభ్యర్థనను అంచనా వేస్తున్నారు. నిర్ణయం రికార్డ్ చేయబడిన తర్వాత ఇక్కడ ఫలితం కనిపిస్తుంది.",
        "passedTitle": "మౌలిక సదుపాయాల పరిశీలన ఆమోదించబడింది",
        "passedSubtitle": "ఈ మౌలిక సదుపాయాల అభ్యర్థన పరిపాలనా పరిశీలనలో విజయవంతంగా ఆమోదం పొందింది.",
        "notPassedTitle": "మౌలిక సదుపాయాల పరిశీలన తిరస్కరించబడింది",
        "notPassedSubtitle": "ఈ మౌలిక సదుపాయాల అభ్యర్థన ప్రస్తుత చక్రం కోసం పరిపాలనా పరిశీలనలో ఆమోదం పొందలేదు.",
        "passedBadge": "ఆమోదించబడింది",
        "notPassedBadge": "తిరస్కరించబడింది",
        "officialSummaryLabel": "అధికారిక పరిపాలనా సారాంశం",
        "decisionDateLabel": "నిర్ణయం రికార్డ్ చేయబడిన తేదీ",
        "resultingStatusLabel": "ఫలిత స్థితి",
        "statusExplanationLabel": "ఈ స్థితి అంటే ఏమిటి",
        "passedExplanation": "ప్రాజెక్ట్ అభ్యర్థన ప్రాథమిక జిల్లా ప్రణాళిక ప్రమాణాలకు అనుగుణంగా ఉంది మరియు మూలధన మౌలిక సదుపాయాల పైప్‌లైన్‌లోకి స్వీకరించబడింది.",
        "notPassedExplanation": "ప్రాజెక్ట్ అభ్యర్థన ప్రస్తుత ప్రణాళిక లేదా సాధ్యత ప్రమాణాలకు అనుగుణంగా లేదు మరియు ప్రస్తుతానికి ముందుకు సాగదు.",
        "disclaimer": "ఇది అధీకృత CivicFix నిర్వాహకుని ద్వారా నమోదు చేయబడిన అధికారిక పరిపాలనా నిర్ణయం."
    },
    "kn": {
        "tag": "ಮೂಲಸೌಕರ್ಯ ಅಭಿವೃದ್ಧಿ ಟ್ರ್ಯಾಕ್",
        "reviewTitle": "ಮೂಲಸೌಕರ್ಯ ಮೌಲ್ಯಮಾಪನ ಪ್ರಗತಿಯಲ್ಲಿದೆ",
        "reviewDescription": "ಈ ಸಮಸ್ಯೆಯನ್ನು ಬಂಡವಾಳ ಮೂಲಸೌಕರ್ಯ ಮೌಲ್ಯಮಾಪನಕ್ಕಾಗಿ ವರ್ಗೀಕರಿಸಲಾಗಿದೆ ಮತ್ತು ಪ್ರಸ್ತುತ ಜಿಲ್ಲಾ ಡೇಟಾ ಮತ್ತು ಯೋಜನಾ ಮಾನದಂಡಗಳನ್ನು ಬಳಸಿಕೊಂಡು ಆಡಳಿತಾತ್ಮಕ ಪರಿಶೀಲನೆ ನಡೆಯುತ್ತಿದೆ.",
        "reviewNotice": "ಅಧಿಕೃತ ನಿರ್ವಾಹಕರು ಜಿಲ್ಲಾ ಯೋಜನಾ ಆದ್ಯತೆಗಳ ಆಧಾರದ ಮೇಲೆ ಈ ವಿನಂತಿಯನ್ನು ಮೌಲ್ಯಮಾಪನ ಮಾಡುತ್ತಿದ್ದಾರೆ. ನಿರ್ಧಾರ ದಾಖಲಾದ ನಂತರ ನಿಮಗೆ ಫಲಿತಾಂಶ ಕಾಣಿಸುತ್ತದೆ.",
        "passedTitle": "ಮೂಲಸೌಕರ್ಯ ಪರಿಶೀಲನೆ ಅನುಮೋದಿಸಲಾಗಿದೆ",
        "passedSubtitle": "ಈ ಮೂಲಸೌಕರ್ಯ ವಿನಂತಿಯು ಆಡಳಿತಾತ್ಮಕ ಪರಿಶೀಲನೆಯಲ್ಲಿ ಯಶಸ್ವಿಯಾಗಿ ತೇರ್ಗಡೆಯಾಗಿದೆ.",
        "notPassedTitle": "ಮೂಲಸೌಕರ್ಯ ಪರಿಶೀಲನೆ ತಿರಸ್ಕರಿಸಲಾಗಿದೆ",
        "notPassedSubtitle": "ಈ ಮೂಲಸೌಕರ್ಯ ವಿನಂತಿಯು ಪ್ರಸ್ತುತ ಚಕ್ರದ ಆಡಳಿತಾತ್ಮಕ ಪರಿಶೀಲನೆಯಲ್ಲಿ ತೇರ್ಗಡೆಯಾಗಿಲ್ಲ.",
        "passedBadge": "ಅನುಮೋದಿತ",
        "notPassedBadge": "ತಿರಸ್ಕೃತ",
        "officialSummaryLabel": "ಅಧಿಕೃತ ಆಡಳಿತಾತ್ಮಕ ಸಾರಾಂಶ",
        "decisionDateLabel": "ನಿರ್ಧಾರ ದಾಖಲಾದ ದಿನಾಂಕ",
        "resultingStatusLabel": "ಫಲಿತಾಂಶ ಸ್ಥಿತಿ",
        "statusExplanationLabel": "ಈ ಸ್ಥಿತಿಯ ಅರ್ಥವೇನು",
        "passedExplanation": "ಯೋಜನಾ ವಿನಂತಿಯು ಪ್ರಾಥಮಿಕ ಜಿಲ್ಲಾ ಯೋಜನಾ ಮಾನದಂಡಗಳನ್ನು ಪೂರೈಸುತ್ತದೆ ಮತ್ತು ಬಂಡವಾಳ ಮೂಲಸೌಕರ್ಯ ಪೈಪ್‌ಲೈನ್‌ಗೆ ಸ್ವೀಕರಿಸಲಾಗಿದೆ.",
        "notPassedExplanation": "ಯೋಜನಾ ವಿನಂತಿಯು ಪ್ರಸ್ತುತ ಯೋಜನೆ ಅಥವಾ ಕಾರ್ಯಸಾಧ್ಯತೆಯ ಮಿತಿಗಳನ್ನು ಪೂರೈಸುವುದಿಲ್ಲ ಮತ್ತು ಈ ಸಮಯದಲ್ಲಿ ಮುಂದುವರಿಯುವುದಿಲ್ಲ.",
        "disclaimer": "ಇದು ಅಧಿಕೃತ CivicFix ನಿರ್ವಾಹಕರು ದಾಖಲಿಸಿದ ಅಧಿಕೃತ ಆಡಳಿತಾತ್ಮಕ ನಿರ್ಧಾರವಾಗಿದೆ."
    },
    "ml": {
        "tag": "അടിസ്ഥാന സൗകര്യ വികസന വിഭാഗം",
        "reviewTitle": "അടിസ്ഥാന സൗകര്യ വിലയിരുത്തൽ പുരോഗമിക്കുന്നു",
        "reviewDescription": "ഈ വിഷയം മൂലധന അടിസ്ഥാന സൗകര്യ വിലയിരുത്തലിനായി തരംതിരിച്ചിരിക്കുന്നു, കൂടാതെ ജില്ലാ ഡാറ്റയും ആസൂത്രണ മാനദണ്ഡങ്ങളും ഉപയോഗിച്ച് ഭരണപരമായ പരിശോധന നടക്കുകയാണ്.",
        "reviewNotice": "ഒരു അംഗീകൃത അഡ്മിനിസ്ട്രേറ്റർ ജില്ലാ ആസൂത്രണ മുൻഗണനകളെ അടിസ്ഥാനമാക്കി ഈ അഭ്യർത്ഥന വിലയിരുത്തുന്നു. തീരുമാനം രേഖപ്പെടുത്തിയാൽ ഫലം ഇവിടെ കാണാം.",
        "passedTitle": "അടിസ്ഥാന സൗകര്യ പരിശോധന പാസായി",
        "passedSubtitle": "ഈ അടിസ്ഥാന സൗകര്യ അഭ്യർത്ഥന ഭരണപരമായ പരിശോധനയിൽ വിജയകരമായി പാസായി.",
        "notPassedTitle": "അടിസ്ഥാന സൗകര്യ പരിശോധന പാസായില്ല",
        "notPassedSubtitle": "ഈ അടിസ്ഥാന സൗകര്യ അഭ്യർത്ഥന നിലവിലെ ഘട്ടത്തിലെ ഭരണപരമായ പരിശോധനയിൽ പാസായില്ല.",
        "passedBadge": "പാസായി",
        "notPassedBadge": "പാസായില്ല",
        "officialSummaryLabel": "ഔദ്യോഗിക ഭരണ സംഗ്രഹം",
        "decisionDateLabel": "തീരുമാനം രേഖപ്പെടുത്തിയ തീയതി",
        "resultingStatusLabel": "ഫലമായ പദവി",
        "statusExplanationLabel": "ഈ അവസ്ഥയുടെ അർത്ഥമെന്താണ്",
        "passedExplanation": "പദ്ധതി അഭ്യർത്ഥന പ്രാഥമിക ജില്ലാ ആസൂത്രണ മാനദണ്ഡങ്ങൾ പാലിക്കുകയും മൂലധന അടിസ്ഥാന സൗകര്യ പൈപ്പ്‌ലൈനിലേക്ക് സ്വീകരിക്കുകയും ചെയ്തു.",
        "notPassedExplanation": "പദ്ധതി അഭ്യർത്ഥന നിലവിലെ ആസൂത്രണ അല്ലെങ്കിൽ പ്രായോഗിക മാനദണ്ഡങ്ങൾ പാലിക്കുന്നില്ല, ഇപ്പോൾ മുന്നോട്ട് പോകില്ല.",
        "disclaimer": "ഇത് അംഗീകൃത CivicFix അഡ്മിനിസ്ട്രേറ്റർ രേഖപ്പെടുത്തിയ ഔദ്യോഗിക ഭരണപരമായ തീരുമാനമാണ്."
    },
    "or": {
        "tag": "ଭିତ୍ତିଭୂମି ବିକାଶ ଟ୍ରାକ୍",
        "reviewTitle": "ଭିତ୍ତିଭୂମି ମୂଲ୍ୟାଙ୍କନ ଚାଲିଛି",
        "reviewDescription": "ଏହି ସମସ୍ୟାକୁ ପୁଞ୍ଜି ଭିତ୍ତିଭୂମି ମୂଲ୍ୟାଙ୍କନ ପାଇଁ ବର୍ଗୀକୃତ କରାଯାଇଛି ଏବଂ ଜିଲ୍ଲା ତଥ୍ୟ ଏବଂ ଯୋଜନା ମାନଦଣ୍ଡ ବ୍ୟବହାର କରି ପ୍ରଶାସନିକ ଯାଞ୍ଚ ଚାଲିଛି।",
        "reviewNotice": "ଜଣେ ପ୍ରାଧିକୃତ ପ୍ରଶାସକ ଜିଲ୍ଲା ଯୋଜନା ପ୍ରାଥମିକତା ଆଧାରରେ ଏହି ଅନୁରୋଧର ମୂଲ୍ୟାଙ୍କନ କରୁଛନ୍ତି। ନିଷ୍ପତ୍ତି ଲିପିବଦ୍ଧ ହେବା ପରେ ଆପଣ ଫଳାଫଳ ଦେଖିପାରିବେ।",
        "passedTitle": "ଭିତ୍ତିଭୂମି ଯାଞ୍ଚ ପାସ୍ ହୋଇଛି",
        "passedSubtitle": "ଏହି ଭିତ୍ତିଭୂମି ଅନୁରୋଧ ପ୍ରଶାସନିକ ଯାଞ୍ଚରେ ସଫଳତାର ସହ ପାସ୍ ହୋଇଛି।",
        "notPassedTitle": "ଭିତ୍ତିଭୂମି ଯାଞ୍ଚ ପାସ୍ ହୋଇନାହିଁ",
        "notPassedSubtitle": "ଏହି ଭିତ୍ତିଭୂମି ଅନୁରୋଧ ବର୍ତ୍ତମାନର ଚକ୍ର ପାଇଁ ପ୍ରଶାସନିକ ଯାଞ୍ଚରେ ପାସ୍ ହୋଇନାହିଁ।",
        "passedBadge": "ପାସ୍",
        "notPassedBadge": "ନାମଞ୍ଜୁର",
        "officialSummaryLabel": "ସରକାରୀ ପ୍ରଶାସନିକ ସାରାଂଶ",
        "decisionDateLabel": "ନିଷ୍ପତ୍ତି ଲିପିବଦ୍ଧ ତାରିଖ",
        "resultingStatusLabel": "ଫଳାଫଳ ସ୍ଥିତି",
        "statusExplanationLabel": "ଏହି ସ୍ଥିତିର ଅର୍ଥ କ’ଣ",
        "passedExplanation": "ପ୍ରକଳ୍ପ ଅନୁରୋଧ ପ୍ରାଥମିକ ଜିଲ୍ଲା ଯୋଜନା ମାନଦଣ୍ଡ ପୂରଣ କରେ ଏବଂ ପୁଞ୍ଜି ଭିତ୍ତିଭୂମି ପାଇପଲାଇନରେ ଗ୍ରହଣ କରାଯାଇଛି।",
        "notPassedExplanation": "ପ୍ରକଳ୍ପ ଅନୁରୋଧ ବର୍ତ୍ତମାନର ଯୋଜନା କିମ୍ବା କାର୍ଯ୍ୟକ୍ଷମତା ସୀମା ପୂରଣ କରେ ନାହିଁ ଏବଂ ବର୍ତ୍ତମାନ ଆଗକୁ ବଢ଼ିବ ନାହିଁ।",
        "disclaimer": "ଏହା ଏକ ପ୍ରାଧିକୃତ CivicFix ପ୍ରଶାସକଙ୍କ ଦ୍ୱାରା ଲିପିବଦ୍ଧ ସରକାରୀ ପ୍ରଶାସନିକ ନିଷ୍ପତ୍ତି।"
    },
    "as": {
        "tag": "আন্তঃগাঁথনি বিকাশ ট্ৰেক",
        "reviewTitle": "আন্তঃগাঁথনি মূল্যায়ন চলি আছে",
        "reviewDescription": "এই সমস্যাটোক মূলধনী আন্তঃগাঁথনি মূল্যায়নৰ বাবে শ্ৰেণীবদ্ধ কৰা হৈছে আৰু বৰ্তমান জিলা তথ্য আৰু পৰিকল্পনাৰ মাপকাঠী ব্যৱহাৰ কৰি প্ৰশাসনিক পৰীক্ষণ চলি আছে।",
        "reviewNotice": "এজন কৰ্তৃত্বপ্ৰাপ্ত প্ৰশাসকে জিলা পৰিকল্পনাৰ অগ্ৰাধিকাৰৰ ভিত্তিত এই অনুৰোধটো মূল্যায়ন কৰিছে। সিদ্ধান্ত লিপিবদ্ধ হোৱাৰ পিছত আপুনি ফলাফল দেখিব পাব।",
        "passedTitle": "আন্তঃগাঁথনি পৰীক্ষণ উত্তীৰ্ণ",
        "passedSubtitle": "এই আন্তঃগাঁথনি অনুৰোধটো প্ৰশাসনিক পৰীক্ষণত সফলতাৰে উত্তীৰ্ণ হৈছে।",
        "notPassedTitle": "আন্তঃগাঁথনি পৰীক্ষণ অনুত্তীৰ্ণ",
        "notPassedSubtitle": "এই আন্তঃগাঁথনি অনুৰোধটো বৰ্তমানৰ চক্ৰৰ বাবে প্ৰশাসনিক পৰীক্ষণত উত্তীৰ্ণ নহ'ল।",
        "passedBadge": "উত্তীৰ্ণ",
        "notPassedBadge": "নাকচ",
        "officialSummaryLabel": "চৰকাৰী প্ৰশাসনিক সাৰাংশ",
        "decisionDateLabel": "সিদ্ধান্ত লিপিবদ্ধ কৰাৰ তাৰিখ",
        "resultingStatusLabel": "ফলাফল স্থিতি",
        "statusExplanationLabel": "এই স্থিতিৰ অৰ্থ কি",
        "passedExplanation": "প্ৰকল্পৰ অনুৰোধটোৱে প্ৰাথমিক জিলা পৰিকল্পনাৰ মাপকাঠী পূৰণ কৰে আৰু মূলধনী আন্তঃগাঁথনি পাইপলাইনত অন্তৰ্ভুক্ত কৰা হৈছে।",
        "notPassedExplanation": "প্ৰকল্পৰ অনুৰোধটোৱে বৰ্তমানৰ পৰিকল্পনা বা কাৰ্যকৰী সীমা পূৰণ নকৰে আৰু এই সময়ত আগনাবাঢ়ে।",
        "disclaimer": "এইটো এজন কৰ্তৃত্বপ্ৰাপ্ত CivicFix প্ৰশাসকৰ দ্বাৰা লিপিবদ্ধ কৰা আনুষ্ঠানিক প্ৰশাসনিক সিদ্ধান্ত।"
    },
    "ur": {
        "tag": "بنیادی ڈھانچے کی ترقی کا شعبہ",
        "reviewTitle": "بنیادی ڈھانچے کی جانچ جاری ہے",
        "reviewDescription": "اس مسئلے کو کیپٹل انفراسٹرکچر اسیسمنٹ کے لیے درجہ بند کیا گیا ہے اور فی الحال ضلعی ڈیٹا اور منصوبہ بندی کے معیارات کا استعمال کرتے ہوئے انتظامی جانچ کی جا رہی ہے۔",
        "reviewNotice": "ایک مجاز ایڈمنسٹریٹر ضلعی منصوبہ بندی کی ترجیحات کی بنیاد پر اس درخواست کا جائزہ لے رہا ہے۔ فیصلہ درج ہونے پر نتیجہ یہاں نظر آئے گا۔",
        "passedTitle": "بنیادی ڈھانچے کی اسکریننگ پاس",
        "passedSubtitle": "یہ بنیادی ڈھانچے کی درخواست انتظامی اسکریننگ میں کامیابی کے ساتھ پاس ہو گئی ہے۔",
        "notPassedTitle": "بنیادی ڈھانچے کی اسکریننگ مسترد",
        "notPassedSubtitle": "یہ بنیادی ڈھانچے کی درخواست موجودہ مرحلے کے لیے انتظامی اسکریننگ میں پاس نہیں ہو سکی۔",
        "passedBadge": "پاس",
        "notPassedBadge": "مسترد",
        "officialSummaryLabel": "سرکاری انتظامی خلاصہ",
        "decisionDateLabel": "فیصلہ درج کرنے کی تاریخ",
        "resultingStatusLabel": "نتیجہ کی حیثیت",
        "statusExplanationLabel": "اس حیثیت کا کیا مطلب ہے",
        "passedExplanation": "منصوبے کی درخواست ابتدائی ضلعی منصوبہ بندی کے معیارات پر پورا اترتی ہے اور اسے کیپٹل انفراسٹرکچر پائپ لائن میں شامل کر لیا گیا ہے۔",
        "notPassedExplanation": "منصوبے کی درخواست موجودہ منصوبہ بندی یا فزیبلٹی کی حدود پر پورا نہیں اترتی اور اس وقت آگے نہیں بڑھے گی۔",
        "disclaimer": "یہ ایک مجاز CivicFix ایڈمنسٹریٹر کا ریکارڈ شدہ باضابطہ انتظامی فیصلہ ہے۔"
    },
    "sa": {
        "tag": "मूलसंरचनाविकासमार्गः",
        "reviewTitle": "मूलसंरचनामूल्याङ्कनं प्रचलति",
        "reviewDescription": "अयं विषयः मूलधनसंरचनामूल्याङ्कनाय वर्गीकृतः अस्ति तथा च जनपददत्तांशस्य योजनाप्रतिमानानां च उपयोगेन प्रशासनिकपरीक्षणं प्रचलति।",
        "reviewNotice": "कश्चन अधिकृतः प्रशासकः जनपदयोजनाप्राथमिकतानाम् आधारेण अस्याः याचनायाः मूल्याङ्कनं करोति। निर्णये अङ्किते सति अत्र परिणामः दृश्यते।",
        "passedTitle": "मूलसंरचनापरीक्षणम् उत्तीर्णम्",
        "passedSubtitle": "इयं मूलसंरचनायाचना प्रशासनिकपरीक्षणे साफल्येन उत्तीर्णा।",
        "notPassedTitle": "मूलसंरचनापरीक्षणम् अनुत्तीर्णम्",
        "notPassedSubtitle": "इयं मूलसंरचनायाचना वर्तमानचक्राय प्रशासनिकपरीक्षणे उत्तीर्णा न जाता।",
        "passedBadge": "उत्तीर्णम्",
        "notPassedBadge": "अस्वीकृतम्",
        "officialSummaryLabel": "आधिकारिकप्रशासनिकसारांशः",
        "decisionDateLabel": "निर्णयाङ्कनदिनाङ्कः",
        "resultingStatusLabel": "परिणामी स्थितिः",
        "statusExplanationLabel": "अस्याः स्थितेः कोऽर्थः",
        "passedExplanation": "प्रकल्पयाचना प्रारम्भिकजनपदयोजनामानदण्डान् पूरयति तथा च मूलधनसंरचनाप्रणाल्यां स्वीकृता।",
        "notPassedExplanation": "प्रकल्पयाचना वर्तमानयोजनायाः साध्यतायाः वा सीमां न पूरयति, अतः अस्मिन् समये अग्रे न गमिष्यति।",
        "disclaimer": "अयम् अधिकृतेन CivicFix प्रशासकेन अङ्कितः आधिकारिकः प्रशासनिकः निर्णयः अस्ति।"
    },
    "ne": {
        "tag": "पूर्वाधार विकास ट्र्याक",
        "reviewTitle": "पूर्वाधार मूल्याङ्कन जारी छ",
        "reviewDescription": "यो समस्यालाई पूँजीगत पूर्वाधार मूल्याङ्कनको लागि वर्गीकृत गरिएको छ र जिल्ला तथ्याङ्क तथा योजना मापदण्डहरू प्रयोग गरी प्रशासनिक छानबिन भइरहेको छ।",
        "reviewNotice": "अधिकृत प्रशासकले जिल्ला योजना प्राथमिकताका आधारमा यस अनुरोधको मूल्याङ्कन गरिरहनुभएको छ। निर्णय अभिलेख भएपछि यहाँ नतिजा देखिनेछ।",
        "passedTitle": "पूर्वाधार छानबिन सफल",
        "passedSubtitle": "यो पूर्वाधार अनुरोध प्रशासनिक छानबिनमा सफलतापूर्वक उत्तीर्ण भएको छ।",
        "notPassedTitle": "पूर्वाधार छानबिन असफल",
        "notPassedSubtitle": "यो पूर्वाधार अनुरोध वर्तमान चक्रको लागि प्रशासनिक छानबिनमा उत्तीर्ण भएन।",
        "passedBadge": "स्वीकृत",
        "notPassedBadge": "अस्वीकृत",
        "officialSummaryLabel": "आधिकारिक प्रशासनिक सारांश",
        "decisionDateLabel": "निर्णय अभिलेख मिति",
        "resultingStatusLabel": "परिणामी स्थिति",
        "statusExplanationLabel": "यो स्थितिको अर्थ के हो",
        "passedExplanation": "आयोजना अनुरोधले प्रारम्भिक जिल्ला योजना मापदण्ड पूरा गर्दछ र पूँजीगत पूर्वाधार पाइपलाइनमा स्वीकार गरिएको छ।",
        "notPassedExplanation": "आयोजना अनुरोधले हालको योजना वा सम्भाव्यता सीमा पूरा गर्दैन र यस समयमा अघि बढ्ने छैन।",
        "disclaimer": "यो आधिकारिक CivicFix प्रशासकद्वारा अभिलेख गरिएको आधिकारिक प्रशासनिक निर्णय हो।"
    },
    "kok": {
        "tag": "बुन्यादी सुविधा विकास ट्रॅक",
        "reviewTitle": "बुन्यादी सुविधा मोलमापणी चालू आसा",
        "reviewDescription": "ह्या विशयाक भांडवली बुन्यादी सुविधा मोलमापणी खातीर वर्गीकृत केलां आनी जिल्लो डेटा आनी नियोजन निकश वापरून प्रशासकीय तपासणी चालू आसा.",
        "reviewNotice": "एक अधिकृत प्रशासक जिल्लो नियोजन प्राधान्यांचेर आदारून हे विनंतीचें मोलमापन करता. निर्णय नोंद जातकच फळ हांगा दिसतले.",
        "passedTitle": "बुन्यादी सुविधा तपासणी मंजूर",
        "passedSubtitle": "ही बुन्यादी सुविधा विनंती प्रशासकीय तपासणेंत यशस्वीरीत्या पास जाल्या.",
        "notPassedTitle": "बुन्यादी सुविधा तपासणी नामंजूर",
        "notPassedSubtitle": "ही बुन्यादी सुविधा विनंती चालू चक्रा खातीर प्रशासकीय तपासणेंत पास जाली ना.",
        "passedBadge": "मंजूर",
        "notPassedBadge": "नामंजूर",
        "officialSummaryLabel": "अधिकृत प्रशासकीय सारांश",
        "decisionDateLabel": "निर्णय नोंद जाल्ली तारीख",
        "resultingStatusLabel": "परिणामी स्थिती",
        "statusExplanationLabel": "हे स्थितीचो अर्थ कितें",
        "passedExplanation": "प्रकल्प विनंती प्राथमिक जिल्लो नियोजन निकश पुराय करता आनी भांडवली बुन्यादी सुविधा पाईपलायनांत स्वीकारल्या.",
        "notPassedExplanation": "प्रकल्प विनंती चालू नियोजन वा शक्यताय मर्यादा पुराय करिstatusExplanationLabelನಾ, आनी ह्या वेळार फुडें वचची ना.",
        "disclaimer": "हो एका अधिकृत CivicFix प्रशासकान नोंद केल्लो अधिकृत प्रशासकीय निर्णय आसा."
    },
    "ks": {
        "tag": "بنیادی ڈھانچہ ترقی ٹریک",
        "reviewTitle": "بنیادی ڈھانچہ جائزہ جاری چھُ",
        "reviewDescription": "یہِ معاملہ چھُ کیپٹل انفراسٹرکچر اسیسمنٹ خٲطرٕ درجہ بند کرنہٕ آمُت تہٕ ضلعی ڈیٹا تہٕ منصوبہ بندی معیارن ہند استعمال کرتھ انتظامی جانچ جاری چھِ۔",
        "reviewNotice": "اَکھ مجاز ایڈمنسٹریٹر چھُ ضلعی منصوبہ بندی ترجیحاتن ہند بنیاد پؠٹھ اَتھ درخواستہِ ہند جائزہ ہیوان۔ فیصلہ درج گژھنہٕ پؠٹھ ییہِ نتیجہ ییٚتہِ ہاونہٕ۔",
        "passedTitle": "بنیادی ڈھانچہ اسکریننگ پاس",
        "passedSubtitle": "یہِ بنیادی ڈھانچہ درخواست گٔیہِ انتظامی اسکریننگ منٛز کامیابی سان پاس۔",
        "notPassedTitle": "بنیادی ڈھانچہ اسکریننگ مسترد",
        "notPassedSubtitle": "یہِ بنیادی ڈھانچہ درخواست پاس نہٕ انتظامی اسکریننگ منٛز یمہِ چکرس خٲطرٕ۔",
        "passedBadge": "پاس",
        "notPassedBadge": "مسترد",
        "officialSummaryLabel": "سرکاری انتظامی خلاصہٕ",
        "decisionDateLabel": "فیصلہ درج کرنے تاریخ",
        "resultingStatusLabel": "نتیجہٕ حیثیت",
        "statusExplanationLabel": "اَتھ حیثیتس کیا مطلب چھُ",
        "passedExplanation": "منصوبہٕ درخواست چھِ ابتدائی ضلعی منصوبہ بندی معیارن پؠٹھ پورٕ یوان تہٕ کیپٹل انفراسٹرکچر پائپ لائن منٛز منظور کرنہٕ آمیژ۔",
        "notPassedExplanation": "منصوبہٕ درخواست چھِ نہٕ موجودٕ منصوبہ بندی یا فزیبلٹی حدن پؠٹھ پورٕ یوان تہٕ فی الحال برونٛہہ پکنے نہٕ۔",
        "disclaimer": "یہِ چھُ اَکھ مجاز CivicFix ایڈمنسٹریٹر سنٛد ریکارڈ کٔرمُت باضابطہ انتظامی فیصلہ۔"
    },
    "sd": {
        "tag": "بنيادي ڍانچي جي ترقي ٽريڪ",
        "reviewTitle": "بنيادي ڍانچي جو جائزو جاري آهي",
        "reviewDescription": "هن مسئلي کي سرمائيداري بنيادي ڍانچي جي جائزي لاءِ درجا بندي ڪيو ويو آهي ۽ ضلعي ڊيٽا ۽ رٿابندي جي معيارن ذريعي انتظامي جاچ جاري آهي.",
        "reviewNotice": "هڪ مجاز ايڊمنسٽريٽر ضلعي رٿابندي جي ترجيحن جي بنياد تي هن درخواست جو جائزو وٺي رهيو آهي. فيصلو داخل ٿيڻ کانپوءِ نتيجو هتي نظر ايندو.",
        "passedTitle": "بنيادي ڍانچي جي اسڪريننگ پاس",
        "passedSubtitle": "هيءَ بنيادي ڍانچي جي درخواست انتظامي اسڪريننگ ۾ ڪاميابي سان پاس ٿي وئي آهي.",
        "notPassedTitle": "بنيادي ڍانچي جي اسڪريننگ ناڪام",
        "notPassedSubtitle": "هيءَ بنيادي ڍانچي جي درخواست موجوده دور لاءِ انتظامي اسڪريننگ ۾ پاس نه ٿي سگهي.",
        "passedBadge": "پاس",
        "notPassedBadge": "رد",
        "officialSummaryLabel": "سرڪاري انتظامي خلاصو",
        "decisionDateLabel": "فيصلو داخل ٿيڻ جي تاريخ",
        "resultingStatusLabel": "نتيجي واري حالت",
        "statusExplanationLabel": "هن حالت جو ڇا مطلب آهي",
        "passedExplanation": "منصوبي جي درخواست شروعاتي ضلعي رٿابندي جي معيارن تي پوري لهي ٿي ۽ سرمائيداري پائپ لائن ۾ شامل ڪئي وئي آهي.",
        "notPassedExplanation": "منصوبي جي درخواست موجوده رٿابندي يا فزيبلٽي معيارن تي پوري نٿي لهي ۽ هن وقت اڳتي نه وڌندي.",
        "disclaimer": "هي هڪ مجاز CivicFix ايڊمنسٽريٽر پاران رڪارڊ ڪيل سرڪاري انتظامي فيصلو آهي."
    },
    "mai": {
        "tag": "मूलभूत संरचना विकास ट्रॅक",
        "reviewTitle": "मूलभूत संरचना मूल्याङ्कन प्रगति पर अछि",
        "reviewDescription": "एहि समस्याकेँ पूँजीगत संरचना मूल्याङ्कन लेल वर्गीकृत कयल गेल अछि आ वर्तमानमे जिला डेटा आ योजना मानदण्डक उपयोग कऽ प्रशासनिक जाँच भऽ रहल अछि।",
        "reviewNotice": "एकटा अधिकृत प्रशासक जिला योजनाक प्राथमिकताबोधक आधार पर एहि अनुरोधक मूल्याङ्कन कऽ रहल छथि। निर्णय दर्ज भेला उत्तर अहाँकेँ एतय परिणाम देखाइ पड़त।",
        "passedTitle": "संरचना जाँच स्वीकृत",
        "passedSubtitle": "ई संरचना अनुरोध प्रशासनिक जाँचमे सफलतापूर्वक पास भऽ गेल।",
        "notPassedTitle": "संरचना जाँच अस्वीकृत",
        "notPassedSubtitle": "ई संरचना अनुरोध वर्तमान चक्र लेल प्रशासनिक जाँचमे पास नहि भऽ सकल।",
        "passedBadge": "स्वीकृत",
        "notPassedBadge": "अस्वीकृत",
        "officialSummaryLabel": "आधिकारिक प्रशासनिक सारांश",
        "decisionDateLabel": "निर्णय दर्ज करबाक तिथि",
        "resultingStatusLabel": "परिणामी स्थिति",
        "statusExplanationLabel": "एहि स्थितिक की अर्थ अछि",
        "passedExplanation": "परियोजना अनुरोध प्रारम्भिक जिला योजना मानदण्ड पूरा करैत अछि आ पूँजीगत संरचना पाइपलाइनमे स्वीकार कयल गेल अछि।",
        "notPassedExplanation": "परियोजना अनुरोध वर्तमान योजना या व्यवहार्यता सीमा पूरा नहि करैत अछि आ एहि समय आगाँ नहि बढ़त।",
        "disclaimer": "ई एकटा अधिकृत CivicFix प्रशासक द्वारा दर्ज कयल गेल आधिकारिक प्रशासनिक निर्णय अछि।"
    },
    "mni": {
        "tag": "য়ুমফম থোইদোকপা চাউখৎ-থৌরাংগী লম্বী",
        "reviewTitle": "য়ুমফমগী মচাক য়েংশিনবা চত্থরি",
        "reviewDescription": "মসিগী ৱাফম অসি অচৌবা য়ুমফমগী মচাক য়েংশিনবগীদমক খায়দোক্লে অমসুং জিলাগী পাউ অমসুং থৌরাংগী কাংলোন শিজিন্নদুনা এদমিনিস্ত্রেতিব ওইনা য়েংশিল্লি।",
        "reviewNotice": "অনুমোদন লৈরবা এদমিনিস্ত্রেতর অমনা জিলাগী থৌরাংগী অহানবা মথৌ তাবশিংদা য়ুমফম ওইরগা হায়জরকপা অসি য়েংশিল্লি। ৱারেপ চেল্লবা মতুংদা মফমসিদা ফল উবা ফংগনি।",
        "passedTitle": "য়ুমফমগী মচাক য়েংশিনবা মায় পাক্লে",
        "passedSubtitle": "য়ুমফমগী মচাক হায়জরকপা অসি এদমিনিস্ত্রেতিব য়েংশিনবদা মায় পাক্লে।",
        "notPassedTitle": "য়ুমফমগী মচাক য়েংশিনবা য়াদে",
        "notPassedSubtitle": "য়ুমফমগী মচাক হায়জরকপা অসি হৌজিক চত্থরিবা তাংককসিদা য়াবা ঙমদে।",
        "passedBadge": "য়ারে",
        "notPassedBadge": "য়াদে",
        "officialSummaryLabel": "অফিসিয়েল এদমিনিস্ত্রেতিব ওইবা মরুপ মরুপ খন্নবা",
        "decisionDateLabel": "ৱারেপ লৌখিবা নুমিত",
        "resultingStatusLabel": "মসিগী ফিভম",
        "statusExplanationLabel": "ফিভম অসিনা তাকপদি",
        "passedExplanation": "থৌরাং অসি জিলাগী অহানবা কাংলোনশিংগা চুনরে অমসুং অচৌবা য়ুমফমগী মচাক থৌরাংগী মনুংদা য়ারে।",
        "notPassedExplanation": "থৌরাং অসিনা হৌজিক্কী থৌরাং নত্রগা য়াবা য়াবগী কাংলোনশিংগা চুনদে অমসুং হৌজিক্কী মতমদা মাংলোইশিনবা ঙমদে।",
        "disclaimer": "মসি অনুমোদন লৈরবা CivicFix এদমিনিস্ত্রেতর অমনা চেল্লবা অফিসিয়েল এদমিনিস্ত্রেতিব ৱারেপনি।"
    }
}

ALL_LANGS = [
    "en", "hi", "mr", "bn", "gu", "pa", "ta", "te", "kn", "ml",
    "or", "as", "ur", "sa", "ne", "kok", "ks", "sd", "mai", "mni"
]

def update_locales():
    for lang in ALL_LANGS:
        file_path = os.path.join(LOCALES_DIR, f"{lang}.json")
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # 1. Update statuses
        statuses = data.setdefault("statuses", {})
        lang_statuses = STATUSES_MAP.get(lang, STATUSES_MAP["en"])
        for k, v in lang_statuses.items():
            statuses[k] = v

        # 2. Update citizen.issueDetails.infrastructure
        citizen = data.setdefault("citizen", {})
        issueDetails = citizen.setdefault("issueDetails", {})
        lang_infra = INFRA_TEXTS_MAP.get(lang, INFRA_TEXTS_MAP["en"])
        issueDetails["infrastructure"] = lang_infra

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")

        print(f"Updated {lang}.json")

if __name__ == "__main__":
    update_locales()
