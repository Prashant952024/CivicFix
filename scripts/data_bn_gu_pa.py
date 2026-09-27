# -*- coding: utf-8 -*-
from data_hi_mr import LANGUAGES_BLOCK

BN_DICT = {
    "common": {
        "loading": "লোড হচ্ছে...",
        "error": "ত্রুটি",
        "tryAgain": "আবার চেষ্টা করুন",
        "back": "ফিরে যান",
        "cancel": "বাতিল",
        "submit": "জমা দিন",
        "save": "সংরক্ষণ করুন",
        "search": "অনুসন্ধান",
        "reset": "পুনরায় সেট করুন",
        "optional": "ঐচ্ছিক",
        "required": "প্রয়োজনীয়",
        "all": "সকল",
        "viewDetails": "বিস্তারিত দেখুন",
        "backToDashboard": "ড্যাশবোর্ডে ফিরুন",
        "workspace": "সিভিকফিক্স কর্মক্ষেত্র",
        "close": "বন্ধ করুন",
        "activeRole": "সক্রিয় ভূমিকা",
        "workflowPipeline": "কর্মপ্রবাহ পাইপলাইন"
    },
    "nav": {
        "dashboard": "ড্যাশবোর্ড",
        "reportIssue": "সমস্যা জানান",
        "myIssues": "আমার অভিযোগসমূহ",
        "notifications": "বিজ্ঞপ্তি",
        "signOut": "সাইন আউট",
        "activeRoleDesc": "{{role}} পরিচালনার জন্য সিভিকফিক্স কর্মক্ষেত্র।"
    },
    "languages": LANGUAGES_BLOCK,
    "categories": {
        "Pothole": "রাস্তার গর্ত",
        "Garbage": "আবর্জনা",
        "Streetlight": "পথবাতি",
        "Water Supply": "জল সরবরাহ",
        "Drainage": "নিকাশী ব্যবস্থা",
        "Road Damage": "রাস্তার ক্ষতি",
        "Traffic/Safety": "যানবাহন / নিরাপত্তা",
        "Other": "অন্যান্য"
    },
    "statuses": {
        "SUBMITTED": "দাখিল করা হয়েছে",
        "AI_ANALYZED": "এআই দ্বারা বিশ্লেষণকৃত",
        "AWAITING_ADMIN_CLASSIFICATION": "শ্রেণীবিভাগ অপেক্ষমাণ",
        "CLASSIFIED_SIMPLE": "সাধারণ শ্রেণীবদ্ধ",
        "CLASSIFIED_COMPLEX": "জটিল চ্যালেঞ্জ",
        "UNDER_REVIEW": "পর্যালোচনাধীন",
        "TRIAGED": "ট্রায়াজ সম্পন্ন",
        "ASSIGNED": "দায়িত্ব অর্পিত",
        "IN_PROGRESS": "চলমান",
        "PARTIALLY_COMPLETED": "আংশিক সম্পন্ন",
        "RESOLVED": "সমাধান হয়েছে",
        "CITIZEN_VERIFIED": "নাগরিক দ্বারা যাচাইকৃত",
        "VERIFIED": "যাচাইকৃত",
        "REOPENED": "পুনরায় খোলা হয়েছে",
        "REJECTED": "প্রত্যাখ্যাত",
        "ESCALATED_TO_INNOVATION": "উদ্ভাবন শাখায় প্রেরিত"
    },
    "priorities": {
        "LOW": "কম",
        "MEDIUM": "মাঝারি",
        "HIGH": "উচ্চ",
        "URGENT": "জরুরি",
        "all": "সকল অগ্রাধিকার"
    },
    "departments": {
        "Roads & Infrastructure": "রাস্তা ও পরিকাঠামো",
        "Sanitation & Waste Management": "পরিচ্ছন্নতা ও বর্জ্য ব্যবস্থাপনা",
        "Electricity & Lighting": "বিদ্যুৎ ও আলোকসজ্জা",
        "Water Supply & Sewerage": "জল সরবরাহ ও নিষ্কাশন",
        "Public Safety & Traffic": "জননিরাপত্তা ও ট্রাফিক",
        "Health & Environment": "স্বাস্থ্য ও পরিবেশ",
        "General Administration": "সাধারণ প্রশাসন"
    },
    "citizen": {
        "dashboard": {
            "tag": "নাগরিক পরিষেবা কেন্দ্র",
            "welcome": "স্বাগতম, {{name}}",
            "subtitle": "আপনার এলাকার নাগরিক সমস্যা রিপোর্ট করুন, পুরসভার অগ্রগতি নজরদারি করুন এবং মাঠপর্যায়ে সমাধান যাচাই করুন।",
            "reportButton": "সমস্যা রিপোর্ট করুন",
            "viewReportsButton": "আমার রিপোর্ট দেখুন",
            "stats": {
                "total": "মোট রিপোর্ট",
                "totalDesc": "দাখিলকৃত সমস্ত নাগরিক অভিযোগ",
                "pending": "পর্যালোচনা অপেক্ষমাণ",
                "pendingDesc": "পৌর কর্তৃপক্ষের সিদ্ধান্তের অপেক্ষায়",
                "inProgress": "চলমান কাজ",
                "inProgressDesc": "মাঠপর্যায়ে কাজ চলছে",
                "resolved": "সমাধান সম্পন্ন",
                "resolvedDesc": "সম্পূর্ণ ও যাচাইকৃত"
            },
            "verificationNotice": {
                "single": "১টি সমাধানকৃত সমস্যায় আপনার মাঠপর্যায়ের যাচাইকরণ প্রয়োজন",
                "multiple": "{{count}}টি সমাধানকৃত সমস্যায় আপনার মাঠপর্যায়ের যাচাইকরণ প্রয়োজন",
                "description": "পৌরসভা কাজ সমাপ্ত করেছে। সমস্যাটি আসলেই সমাধান হয়েছে কিনা দয়া করে নিশ্চিত করুন।",
                "action": "এখনই যাচাই করুন"
            },
            "recentActivity": "সাম্প্রতিক কার্যকলাপ",
            "latestReports": "সাম্প্রতিক নাগরিক রিপোর্ট",
            "viewAll": "সকল দেখুন ({{count}})",
            "impact": {
                "tag": "সামাজিক প্রভাব",
                "title": "পৌর প্রশাসনকে দায়বদ্ধ করা",
                "description": "আপনার প্রতিটি রিপোর্ট নাগরিক পরিকাঠামো উন্নয়নে এবং শহরকে পরিচ্ছন্ন ও নিরাপদ রাখতে সাহায্য করে।",
                "totalImpact": "আপনার মোট অবদান",
                "reports": "রিপোর্ট",
                "registry": "পৌর নথিতে অন্তর্ভুক্ত",
                "resolutionRate": "সমাধানের হার",
                "resolvedCount": "{{total}} টির মধ্যে {{resolved}} টি সমাধান"
            },
            "empty": {
                "title": "এখনও কোনও রিপোর্ট নেই",
                "description": "আপনি এখনও কোনও নাগরিক সমস্যা জানাননি। আপনার এলাকার সমস্যার ছবি তুলে প্রথম রিপোর্ট জমা দিন।",
                "primaryAction": "এখনই সমস্যা জানান",
                "secondaryAction": "সমস্যা তালিকা দেখুন"
            },
            "loadError": "আপনার রিপোর্ট লোড করা যায়নি।"
        },
        "report": {
            "tag": "নাগরিক অভিযোগ দাখিল",
            "title": "নাগরিক সমস্যা রিপোর্ট করুন",
            "description": "পরিকাঠামো, পরিচ্ছন্নতা বা নিরাপত্তা সংক্রান্ত অভিযোগ জানান। আপনার রিপোর্ট সরাসরি সংশ্লিষ্ট কর্মকর্তাদের কাছে পৌঁছাবে।",
            "steps": {
                "step1": "১",
                "step1Title": "সমস্যার বিবরণ দিন",
                "step1Subtitle": "আপনি কোন সমস্যার কথা জানাচ্ছেন?",
                "step2": "২",
                "step2Title": "স্থান নির্ধারণ করুন",
                "step2Subtitle": "সমস্যাটি কোথায় অবস্থিত?",
                "step3": "৩",
                "step3Title": "ছবি সংযুক্ত করুন",
                "step3Subtitle": "সমস্যার একটি স্পষ্ট ছবি দিন",
                "step4": "৪",
                "step4Title": "জমা দিতে প্রস্তুত?",
                "step4Subtitle": "জমা দেওয়ার আগে উপরে দেওয়া তথ্য যাচাই করে নিন।"
            },
            "fields": {
                "titleLabel": "সমস্যার শিরোনাম",
                "titlePlaceholder": "যেমন: ভাঙা পথবাতি, উপচে পড়া ময়লার ডাস্টবিন, গভীর গর্ত",
                "categoryLabel": "বিভাগ",
                "categorySelect": "একটি বিভাগ নির্বাচন করুন",
                "descriptionLabel": "বিবরণ",
                "descriptionPlaceholder": "সমস্যার বিস্তারিত বিবরণ দিন: সঠিক স্থান, বিপদের আশঙ্কা, কতদিন ধরে সমস্যাটি রয়েছে...",
                "locationLabel": "স্থান ও ল্যান্ডমার্ক",
                "locationPlaceholder": "যেমন: মেট্রো পিলার ১৪২ এর কাছে, জুবিলি হিলস রোড নং ৩৬",
                "gpsTitle": "জিপিএস অবস্থান",
                "gpsDescription": "সঠিক স্থানাঙ্ক কর্মীদের দ্রুত ঘটনাস্থল খুঁজে পেতে সাহায্য করে।",
                "gpsButton": "আমার বর্তমান অবস্থান ব্যবহার করুন",
                "gpsDetecting": "জিপিএস শনাক্ত করা হচ্ছে...",
                "gpsCaptured": "স্থানাঙ্ক প্রাপ্ত: {{lat}}, {{lng}}",
                "gpsAccuracy": " (±{{accuracy}}মি)",
                "photoUploadTitle": "ছবি তুলতে বা নির্বাচন করতে ক্লিক করুন",
                "photoUploadDesc": "JPG, PNG, HEIC, WebP সমর্থিত। আপলোডের আগে ছবিগুলি স্বয়ংক্রিয়ভাবে কম্প্রেস করা হয়।",
                "selectFile": "ফাইল নির্বাচন করুন",
                "processingFile": "প্রক্রিয়াকরণ হচ্ছে...",
                "removePhoto": "মুছে ফেলুন"
            },
            "voice": {
                "speakButton": "মুখে বলে বিবরণ দিন",
                "listening": "শুনছি... এখন বলুন",
                "stop": "থামুন",
                "transcribing": "এআই দ্বারা লিখিত রূপ দেওয়া হচ্ছে...",
                "detectedLanguage": "{{language}} ভাষায় শনাক্ত",
                "replaceOrAppend": "টেক্সট রূপান্তর সম্পন্ন। নিচে দেখে নিন বা সম্পাদনা করুন।",
                "micPermissionDenied": "মাইক্রোফোনের অনুমতি পাওয়া যায়নি। ব্রাউজার সেটিংসে অনুমতি দিন।",
                "micNotSupported": "এই ব্রাউজারে ভয়েস রেকর্ডিং সমর্থিত নয়।",
                "transcriptionFailed": "ভয়েস রূপান্তর ব্যর্থ হয়েছে। আবার চেষ্টা করুন বা টাইপ করুন।",
                "reviewTitle": "ভয়েস টেক্সট পর্যালোচনা",
                "originalTextLabel": "মৌখিক টেক্সট",
                "englishTranslationLabel": "ইংরেজি অনুবাদ",
                "useTranscription": "এই টেক্সট ব্যবহার করুন",
                "recordAgain": "পুনরায় রেকর্ড করুন",
                "discard": "বাতিল করুন"
            },
            "stages": {
                "idle": "জমা দেওয়ার জন্য প্রস্তুত",
                "saving": "সমস্যা নথিভুক্ত করা হচ্ছে...",
                "uploading": "ছবি আপলোড হচ্ছে...",
                "finalizing": "রিপোর্ট চূড়ান্ত করা হচ্ছে..."
            },
            "submitButton": "নাগরিক রিপোর্ট জমা দিন",
            "successModal": {
                "tag": "রিপোর্ট সফলভাবে জমা হয়েছে",
                "title": "আপনার নাগরিক রিপোর্ট গ্রহণ করা হয়েছে!",
                "refText": "সিভিকফিক্স আপনার রিপোর্টটি নথিভুক্ত করেছে এবং একটি রেফারেন্স নম্বর দিয়েছে",
                "summary": "রিপোর্টের সারাংশ",
                "titleField": "শিরোনাম",
                "categoryField": "বিভাগ",
                "statusField": "অবস্থা",
                "submittedAtField": "জমা দেওয়ার সময়",
                "viewIssue": "আমার সমস্যা দেখুন",
                "backToDashboard": "ড্যাশবোর্ডে ফিরুন"
            },
            "partialErrorModal": {
                "tag": "নোটিশ সহ রিপোর্ট সংরক্ষিত",
                "title": "আপনার রিপোর্ট তৈরি হয়েছে",
                "description": "সমস্যাটি ডাটাবেসে নথিভুক্ত হয়েছে, তবে ছবি আপলোড সম্পন্ন করা যায়নি।",
                "viewIssues": "আমার অভিযোগ দেখুন",
                "backToDashboard": "ড্যাশবোর্ডে ফিরুন"
            },
            "validation": {
                "title": "অনুগ্রহ করে সমস্যার শিরোনাম দিন।",
                "description": "অনুগ্রহ করে সমস্যার বিবরণ দিন।",
                "category": "অনুগ্রহ করে একটি বিভাগ নির্বাচন করুন।",
                "location": "অনুগ্রহ করে স্থান বা ল্যান্ডমার্ক উল্লেখ করুন।",
                "image": "অনুগ্রহ করে একটি JPG, PNG, HEIC বা WebP ছবি নির্বাচন করুন।"
            }
        },
        "issues": {
            "tag": "অভিযোগ খাতা",
            "title": "আমার নাগরিক অভিযোগসমূহ",
            "description": "আপনার শহরে দাখিল করা প্রতিটি অভিযোগ অনুসন্ধান, ফিল্টার এবং পর্যবেক্ষণ করুন।",
            "reportButton": "সমস্যা রিপোর্ট করুন",
            "searchPlaceholder": "শিরোনাম, অবস্থান, বিভাগ, বিবরণ দিয়ে খুঁজুন...",
            "sortNewest": "নতুনতম আগে",
            "sortOldest": "পুরাতন আগে",
            "filtersSort": "ফিল্টার ও সাজানো",
            "resetFilters": "ফিল্টার রিসেট করুন",
            "showingCount": "{{total}} টির মধ্যে {{filtered}} টি রিপোর্ট প্রদর্শিত",
            "sortedBy": "সাজানো হয়েছে: {{order}}",
            "empty": {
                "noReports": "কোনও রিপোর্ট পাওয়া যায়নি",
                "noReportsDesc": "আপনি এখনও কোনও সমস্যা রিপোর্ট করেননি। প্রথম রিপোর্ট তৈরি করে শুরু করুন।",
                "noMatches": "মিল পাওয়া যায়নি",
                "noMatchesDesc": "বর্তমান অনুসন্ধানের সাথে কোনও রিপোর্ট মিলছে না। ফিল্টার পরিবর্তন করে দেখুন।"
            },
            "filterLabels": {
                "all": "সকল",
                "pending": "অপেক্ষমাণ",
                "verified": "যাচাইকৃত",
                "inProgress": "চলমান",
                "resolved": "সমাধান হয়েছে",
                "reopened": "পুনরায় খোলা হয়েছে",
                "rejected": "প্রত্যাখ্যাত"
            }
        },
        "issueDetails": {
            "backToReports": "আমার রিপোর্টে ফিরুন",
            "reportedOn": "{{date}} তারিখে দাখিল করা হয়েছে",
            "reference": "রেফারেন্স #{{id}}",
            "descriptionSection": "সমস্যার বিবরণ",
            "locationSection": "স্থানের তথ্য",
            "landmark": "ল্যান্ডমার্ক / ঠিকানা",
            "coordinates": "জিপিএস স্থানাঙ্ক",
            "openMap": "ম্যাপে দেখুন",
            "photoSection": "ফটোগ্রাফিক প্রমাণ",
            "initialPhoto": "নাগরিকের জমা দেওয়া ছবি",
            "resolutionPhoto": "সমাধানের প্রমাণ ছবি",
            "timelineSection": "অগ্রগতি ও ইতিহাসের সময়রেখা",
            "deptAssignment": "দায়িত্বপ্রাপ্ত বিভাগ",
            "originalLanguage": "মূল ভাষা",
            "inputMethod": "দাখিল মাধ্যম",
            "voiceInput": "ভয়েস রেকর্ডিং",
            "textInput": "লিখিত টেক্সট",
            "viewEnglish": "ইংরেজি অনুবাদ দেখুন",
            "viewOriginal": "মূল দেখুন ({{lang}})",
            "canonicalNotice": "এই রিপোর্টটি {{lang}} ভাষায় জমা দেওয়া হয়েছিল এবং পৌরসভার কাজের জন্য ইংরেজিতে অনুবাদ করা হয়েছে।",
            "verificationCard": {
                "title": "মাঠপর্যায়ের যাচাইকরণ প্রয়োজন",
                "description": "পৌর দল এই সমস্যাটি সমাধান হয়েছে বলে চিহ্নিত করেছে। সমস্যাটি কি সত্যিই ঠিক হয়েছে?",
                "yesButton": "হ্যাঁ, সমস্যা সমাধান হয়েছে",
                "noButton": "না, এখনও ঠিক হয়নি (পুনরায় খুলুন)",
                "verifiedYes": "আপনি সমাধান নিশ্চিত করেছেন। সহযোগিতার জন্য ধন্যবাদ!",
                "verifiedNo": "আপনি জানিয়েছেন সমস্যাটি সমাধান হয়নি। এটি পুনরায় খতিয়ে দেখা হবে।"
            },
            "reopenModal": {
                "title": "সমস্যা পুনরায় খুলুন",
                "description": "কেন সমস্যাটি সমাধান হয়নি তা ব্যাখ্যা করুন যাতে কর্মীরা পুনরায় পদক্ষেপ নিতে পারেন।",
                "feedbackLabel": "পুনরায় খোলার কারণ",
                "feedbackPlaceholder": "যেমন: লাইট ঠিক করা হয়েছিল কিন্তু পরের দিন আবার নিভে গেছে...",
                "submitReopen": "পুনরায় খুলুন",
                "cancel": "বাতিল"
            }
        },
        "notifications": {
            "tag": "বিজ্ঞপ্তি কেন্দ্র",
            "title": "নাগরিক সতর্কতা ও আপডেট",
            "description": "আপনার দাখিল করা সমস্যার অবস্থা এবং পৌর কার্যক্রমের সর্বশেষ আপডেট পান।",
            "emptyTitle": "এখনও কোনও বিজ্ঞপ্তি নেই",
            "emptyDescription": "আপনার সমস্ত আপডেট দেখা হয়েছে! নতুন তথ্য এখানে প্রদর্শিত হবে।",
            "today": "আজ",
            "earlier": "পূর্বে",
            "total": "মোট",
            "unread": "অপঠিত",
            "read": "পঠিত",
            "unreadBadge": "অপঠিত",
            "loadError": "আপনার বিজ্ঞপ্তি লোড করা যায়নি।"
        },
        "userMenu": {
            "accountMenu": "ব্যবহারকারী অ্যাকাউন্ট মেনু",
            "signOut": "সাইন আউট"
        }
    }
}

GU_DICT = {
    "common": {
        "loading": "લોડ થઈ રહ્યું છે...",
        "error": "ભૂલ",
        "tryAgain": "ફરી પ્રયાસ કરો",
        "back": "પાછા જાઓ",
        "cancel": "રદ કરો",
        "submit": "સબમિટ કરો",
        "save": "સાચવો",
        "search": "શોધો",
        "reset": "રીસેટ કરો",
        "optional": "વૈકલ્પિક",
        "required": "જરૂરી",
        "all": "બધા",
        "viewDetails": "વિગત જુઓ",
        "backToDashboard": "ડેશબોર્ડ પર પાછા જાઓ",
        "workspace": "સિવિકફિક્સ વર્કસ્પેસ",
        "close": "બંધ કરો",
        "activeRole": "સક્રિય ભૂમિકા",
        "workflowPipeline": "કાર્યપ્રવાહ પાઇપલાઇન"
    },
    "nav": {
        "dashboard": "ડેશબોર્ડ",
        "reportIssue": "સમસ્યા નોંધાવો",
        "myIssues": "મારી ફરિયાદો",
        "notifications": "સૂચનાઓ",
        "signOut": "સાઇન આઉટ",
        "activeRoleDesc": "{{role}} કામગીરી માટે સિવિકફિક્સ વર્કસ્પેસ."
    },
    "languages": LANGUAGES_BLOCK,
    "categories": {
        "Pothole": "રસ્તા પર ખાડો",
        "Garbage": "કચરો",
        "Streetlight": "સ્ટ્રીટલાઇટ",
        "Water Supply": "પાણી પુરવઠો",
        "Drainage": "ગટર / નિકાલ",
        "Road Damage": "રસ્તાનું નુકસાન",
        "Traffic/Safety": "ટ્રાફિક / સુરક્ષા",
        "Other": "અન્ય"
    },
    "statuses": {
        "SUBMITTED": "નોંધણી થઈ",
        "AI_ANALYZED": "AI દ્વારા વિશ્લેષિત",
        "AWAITING_ADMIN_CLASSIFICATION": "વર્ગીકરણ બાકી",
        "CLASSIFIED_SIMPLE": "સામાન્ય વર્ગીકૃત",
        "CLASSIFIED_COMPLEX": "જટિલ સમસ્યા",
        "UNDER_REVIEW": "સમીક્ષા હેઠળ",
        "TRIAGED": "ટ્રાયાજ પૂર્ણ",
        "ASSIGNED": "સોંપાયેલ",
        "IN_PROGRESS": "પ્રગતિ હેઠળ",
        "PARTIALLY_COMPLETED": "અંશતઃ પૂર્ણ",
        "RESOLVED": "ઉકેલાઈ ગઈ",
        "CITIZEN_VERIFIED": "નાગરિક દ્વારા ચકાસાયેલ",
        "VERIFIED": "ચકાસાયેલ",
        "REOPENED": "ફરીથી ખોલાયેલ",
        "REJECTED": "નકારવામાં આવેલ",
        "ESCALATED_TO_INNOVATION": "સંશોધનમાં મોકલેલ"
    },
    "priorities": {
        "LOW": "ઓછી",
        "MEDIUM": "મધ્યમ",
        "HIGH": "ઉચ્ચ",
        "URGENT": "તાત્કાલિક",
        "all": "બધી પ્રાથમિકતાઓ"
    },
    "departments": {
        "Roads & Infrastructure": "માર્ગ અને માળખાગત સુવિધાઓ",
        "Sanitation & Waste Management": "સ્વચ્છતા અને કચરા વ્યવસ્થાપન",
        "Electricity & Lighting": "વીજળી અને સ્ટ્રીટલાઇટિંગ",
        "Water Supply & Sewerage": "પાણી પુરવઠો અને ગટર વ્યવસ્થા",
        "Public Safety & Traffic": "જાહેર સુરક્ષા અને ટ્રાફિક",
        "Health & Environment": "આરોગ્ય અને પર્યાવરણ",
        "General Administration": "સામાન્ય વહીવટ"
    },
    "citizen": {
        "dashboard": {
            "tag": "નાગરિક સેવા કેન્દ્ર",
            "welcome": "સ્વાગત છે, {{name}}",
            "subtitle": "તમારા વિસ્તારની નાગરિક સમસ્યાઓની ફરિયાદ કરો, નગરપાલિકાની કામગીરી ટ્રૅક કરો અને વાસ્તવિક સમાધાનની ચકાસણી કરો.",
            "reportButton": "સમસ્યા નોંધાવો",
            "viewReportsButton": "મારી ફરિયાદો જુઓ",
            "stats": {
                "total": "કુલ ફરિયાદો",
                "totalDesc": "નોંધાયેલી તમામ નાગરિક ફરિયાદો",
                "pending": "પ્રક્રિયા હેઠળ",
                "pendingDesc": "પાલિકા સમીક્ષાની રાહમાં",
                "inProgress": "કામ ચાલુ છે",
                "inProgressDesc": "સ્થળ પર કામગીરી ચાલુ",
                "resolved": "ઉકેલાઈ ગઈ",
                "resolvedDesc": "પૂર્ણ અને ચકાસાયેલ"
            },
            "verificationNotice": {
                "single": "1 ઉકેલાયેલ સમસ્યા પર તમારી ચકાસણી જરૂરી છે",
                "multiple": "{{count}} ઉકેલાયેલ સમસ્યાઓ પર તમારી ચકાસણી જરૂરી છે",
                "description": "પાલિકા દ્વારા કામ પૂરું થયું છે. કૃપા કરીને પુષ્ટિ કરો કે સમસ્યા ખરેખર ઉકેલાઈ ગઈ છે.",
                "action": "હમણાં ચકાસો"
            },
            "recentActivity": "તાજેતરની પ્રવૃત્તિ",
            "latestReports": "તાજેતરની ફરિયાદો",
            "viewAll": "બધી જુઓ ({{count}})",
            "impact": {
                "tag": "સામૂહિક પ્રભાવ",
                "title": "નગરપાલિકાને જવાબદાર બનાવવી",
                "description": "તમારી દરેક ફરિયાદ વહીવટી તંત્રને જવાબદાર બનાવે છે અને શહેરને સ્વચ્છ તથા સુરક્ષિત રાખવામાં મદદ કરે છે.",
                "totalImpact": "તમારો કુલ પ્રભાવ",
                "reports": "ફરિયાદો",
                "registry": "શહેર રજિસ્ટરમાં નોંધાયેલ",
                "resolutionRate": "નિરાકરણ દર",
                "resolvedCount": "{{total}} માંથી {{resolved}} ઉકેલાઈ"
            },
            "empty": {
                "title": "હજુ સુધી કોઈ ફરિયાદ નોંધાઈ નથી",
                "description": "તમે હજુ સુધી કોઈ સમસ્યા નોંધાવી નથી. તમારા વિસ્તારની સમસ્યાનો ફોટો પાડી પહેલી ફરિયાદ નોંધાવો.",
                "primaryAction": "હમણાં સમસ્યા નોંધાવો",
                "secondaryAction": "સમસ્યા યાદી જુઓ"
            },
            "loadError": "તમારી ફરિયાદો લોડ કરવામાં અસમર્થ."
        },
        "report": {
            "tag": "નાગરિક ફરિયાદ નોંધણી",
            "title": "નાગરિક સમસ્યા નોંધાવો",
            "description": "માળખાગત સુવિધા, સફાઈ અથવા સુરક્ષા અંગે ફરિયાદ કરો. તમારી ફરિયાદ સીધી જવાબદાર અધિકારીઓ સુધી પહોંચશે.",
            "steps": {
                "step1": "1",
                "step1Title": "સમસ્યાનું વર્ણન કરો",
                "step1Subtitle": "તમે કઈ સમસ્યાની ફરિયાદ કરી રહ્યા છો?",
                "step2": "2",
                "step2Title": "સ્થળ દર્શાવો",
                "step2Subtitle": "સમસ્યા ક્યાં આવેલી છે?",
                "step3": "3",
                "step3Title": "ફોટો જોડો",
                "step3Subtitle": "સમસ્યાનો ફોટો પુરાવો આપો",
                "step4": "4",
                "step4Title": "સબમિટ કરવા તૈયાર?",
                "step4Subtitle": "કૃપા કરીને સબમિટ કરતા પહેલાં વિગતો ચકાસી લો."
            },
            "fields": {
                "titleLabel": "સમસ્યાનું શીર્ષક",
                "titlePlaceholder": "દા.ત. બંધ પડેલી સ્ટ્રીટલાઇટ, કચરાનો ઢગલો, રસ્તા પર મોટો ખાડો",
                "categoryLabel": "શ્રેણી",
                "categorySelect": "શ્રેણી પસંદ કરો",
                "descriptionLabel": "વિગતવાર વર્ણન",
                "descriptionPlaceholder": "સમસ્યાની વિગતો આપો: ચોક્કસ જગ્યા, જોખમ, કેટલા સમયથી છે...",
                "locationLabel": "સ્થળ અને લેન્ડમાર્ક",
                "locationPlaceholder": "દા.ત. મેટ્રો પિલર 142 પાસે, જુબિલી હિલ્સ રોડ નં 36",
                "gpsTitle": "જીપીએસ સ્થાન",
                "gpsDescription": "અક્ષાંશ-રેખાંશ જોડવાથી કર્મચારીઓને સ્થળ ઝડપથી શોધવામાં મદદ મળે છે.",
                "gpsButton": "મારું વર્તમાન સ્થાન વાપરો",
                "gpsDetecting": "જીપીએસ શોધી રહ્યું છે...",
                "gpsCaptured": "સ્થાન પ્રાપ્ત: {{lat}}, {{lng}}",
                "gpsAccuracy": " (±{{accuracy}}મી)",
                "photoUploadTitle": "ફોટો પસંદ કરવા અથવા પાડવા માટે ક્લિક કરો",
                "photoUploadDesc": "JPG, PNG, HEIC, WebP સપોર્ટેડ. અપલોડ કરતાં પહેલાં ફોટો આપોઆપ કમ્પ્રેસ થાય છે.",
                "selectFile": "ફાઇલ પસંદ કરો",
                "processingFile": "પ્રોસેસિંગ...",
                "removePhoto": "દૂર કરો"
            },
            "voice": {
                "speakButton": "બોલીને વર્ણન આપો",
                "listening": "સાંભળી રહ્યું છે... હવે બોલો",
                "stop": "રોકો",
                "transcribing": "AI દ્વારા અવાજ ટેક્સ્ટમાં બદલાઈ રહ્યો છે...",
                "detectedLanguage": "{{language}} ભાષામાં ઓળખાયેલ",
                "replaceOrAppend": "ટેક્સ્ટ તૈયાર થઈ ગયું. નીચે ચકાસો અથવા સુધારો.",
                "micPermissionDenied": "માઇક્રોફોન પરવાનગી નકારી છે. બ્રાઉઝર સેટિંગ્સમાં પરવાનગી આપો.",
                "micNotSupported": "આ બ્રાઉઝરમાં વોઇસ રેકોર્ડિંગ સપોર્ટ નથી.",
                "transcriptionFailed": "વોઇસ ટ્રાન્સક્રિપ્શન નિષ્ફળ ગયું. ફરી પ્રયાસ કરો અથવા ટાઇપ કરો.",
                "reviewTitle": "વોઇસ ટેક્સ્ટ સમીક્ષા",
                "originalTextLabel": "મૂળ બોલાયેલ ટેક્સ્ટ",
                "englishTranslationLabel": "અંગ્રેજી અનુવાદ",
                "useTranscription": "આ ટેક્સ્ટ વાપરો",
                "recordAgain": "ફરી રેકોર્ડ કરો",
                "discard": "રદ કરો"
            },
            "stages": {
                "idle": "સબમિટ કરવા માટે તૈયાર",
                "saving": "સમસ્યા નોંધાઈ રહી છે...",
                "uploading": "ફોટો અપલોડ થઈ રહ્યો છે...",
                "finalizing": "ફરિયાદ આખરી થઈ રહી છે..."
            },
            "submitButton": "નાગરિક ફરિયાદ સબમિટ કરો",
            "successModal": {
                "tag": "ફરિયાદ સફળતાપૂર્વક નોંધાઈ ગઈ",
                "title": "તમારી ફરિયાદ નોંધાઈ ગઈ છે!",
                "refText": "સિવિકફિક્સે તમારી ફરિયાદ નોંધી છે અને સંદર્ભ નંબર ફાળવ્યો છે",
                "summary": "ફરિયાદ સારાંશ",
                "titleField": "શીર્ષક",
                "categoryField": "શ્રેણી",
                "statusField": "સ્થિતિ",
                "submittedAtField": "નોંધણી સમય",
                "viewIssue": "મારી ફરિયાદ જુઓ",
                "backToDashboard": "ડેશબોર્ડ પર પાછા જાઓ"
            },
            "partialErrorModal": {
                "tag": "સૂચના સાથે ફરિયાદ સચવાઈ",
                "title": "તમારી ફરિયાદ બની ગઈ છે",
                "description": "સમસ્યા ડેટાબેઝમાં નોંધાઈ ગઈ છે, પરંતુ ફોટો અપલોડ પૂર્ણ થઈ શક્યો નથી.",
                "viewIssues": "મારી ફરિયાદો જુઓ",
                "backToDashboard": "ડેશબોર્ડ પર પાછા જાઓ"
            },
            "validation": {
                "title": "કૃપા કરીને સમસ્યાનું શીર્ષક આપો.",
                "description": "કૃપા કરીને સમસ્યાનું વર્ણન આપો.",
                "category": "કૃપા કરીને શ્રેણી પસંદ કરો.",
                "location": "કૃપા કરીને સ્થળ અથવા લેન્ડમાર્ક દાખલ કરો.",
                "image": "કૃપા કરીને JPG, PNG, HEIC અથવા WebP ફોટો પસંદ કરો."
            }
        },
        "issues": {
            "tag": "ફરિયાદ રજિસ્ટર",
            "title": "મારી નાગરિક ફરિયાદો",
            "description": "તમારા શહેરમાં નોંધાયેલી દરેક ફરિયાદ શોધો, ફિલ્ટર કરો અને તેની પ્રગતિ પર નજર રાખો.",
            "reportButton": "સમસ્યા નોંધાવો",
            "searchPlaceholder": "શીર્ષક, સ્થળ, શ્રેણી, વર્ણન દ્વારા શોધો...",
            "sortNewest": "નવીનતમ પહેલાં",
            "sortOldest": "જૂની પહેલાં",
            "filtersSort": "ફિલ્ટર્સ અને ગોઠવણી",
            "resetFilters": "ફિલ્ટર્સ રીસેટ કરો",
            "showingCount": "{{total}} માંથી {{filtered}} ફરિયાદો દર્શાવેલ છે",
            "sortedBy": "ક્રમ: {{order}}",
            "empty": {
                "noReports": "કોઈ ફરિયાદ મળી નથી",
                "noReportsDesc": "તમે હજુ સુધી કોઈ ફરિયાદ નોંધાવી નથી. પ્રથમ સિવિકફિક્સ ફરિયાદ નોંધાવી શરૂઆત કરો.",
                "noMatches": "કોઈ મેળ ખાતી ફરિયાદ નથી",
                "noMatchesDesc": "વર્તમાન શોધ અથવા ફિલ્ટર સાથે કોઈ ફરિયાદ મળતી નથી. ફિલ્ટર્સ રીસેટ કરી જુઓ."
            },
            "filterLabels": {
                "all": "બધા",
                "pending": "બાકી",
                "verified": "ચકાસાયેલ",
                "inProgress": "ચાલુ",
                "resolved": "ઉકેલાઈ ગઈ",
                "reopened": "ફરી ખુલેલી",
                "rejected": "નકારેલી"
            }
        },
        "issueDetails": {
            "backToReports": "મારી ફરિયાદો પર પાછા જાઓ",
            "reportedOn": "{{date}} ના રોજ નોંધાયેલ",
            "reference": "સંદર્ભ #{{id}}",
            "descriptionSection": "સમસ્યાની વિગત",
            "locationSection": "સ્થળની માહિતી",
            "landmark": "લેન્ડમાર્ક / સરનામું",
            "coordinates": "જીપીએસ અક્ષાંશ-રેખાંશ",
            "openMap": "નકશામાં જુઓ",
            "photoSection": "ફોટો પુરાવા",
            "initialPhoto": "નાગરિકે જોડેલો ફોટો",
            "resolutionPhoto": "નિરાકરણનો પુરાવો ફોટો",
            "timelineSection": "પ્રગતિ અને ઇતિહાસ",
            "deptAssignment": "સોંપાયેલ વિભાગ",
            "originalLanguage": "મૂળ ભાષા",
            "inputMethod": "નોંધણી માધ્યમ",
            "voiceInput": "વોઇસ રેકોર્ડિંગ",
            "textInput": "લખેલ ટેક્સ્ટ",
            "viewEnglish": "અંગ્રેજી અનુવાદ જુઓ",
            "viewOriginal": "મૂળ જુઓ ({{lang}})",
            "canonicalNotice": "આ ફરિયાદ {{lang}} ભાષામાં નોંધાઈ હતી અને પાલિકાના કામકાજ માટે અંગ્રેજીમાં અનુવાદિત થઈ છે.",
            "verificationCard": {
                "title": "વાસ્તવિક ચકાસણી જરૂરી",
                "description": "પાલિકાના કર્મચારીઓએ આ સમસ્યા ઉકેલાઈ ગઈ તરીકે દર્શાવી છે. શું સ્થળ પર સમસ્યા ખરેખર ઉકેલાઈ છે?",
                "yesButton": "હા, સમસ્યા ઉકેલાઈ ગઈ છે",
                "noButton": "ના, હજુ પણ સમસ્યા છે (ફરી ખોલો)",
                "verifiedYes": "તમે સમસ્યા ઉકેલાઈ હોવાની પુષ્ટિ કરી છે. આભાર!",
                "verifiedNo": "તમે નોંધાવ્યું કે સમસ્યા ઉકેલાઈ નથી. તે ફરીથી તપાસ માટે મોકલવામાં આવી છે."
            },
            "reopenModal": {
                "title": "ફરિયાદ ફરીથી ખોલો",
                "description": "સમસ્યા શા માટે ઉકેલાઈ નથી તે સમજાવો જેથી કર્મચારીઓ સુધારાત્મક પગલાં લઈ શકે.",
                "feedbackLabel": "ફરી ખોલવાનું કારણ",
                "feedbackPlaceholder": "દા.ત. લાઇટ રિપેર કરી હતી પણ બીજા દિવસે ફરી બંધ થઈ ગઈ...",
                "submitReopen": "ફરિયાદ ફરી ખોલો",
                "cancel": "રદ કરો"
            }
        },
        "notifications": {
            "tag": "સૂચના કેન્દ્ર",
            "title": "નાગરિક એલર્ટ્સ અને અપડેટ્સ",
            "description": "તમારી ફરિયાદોની સ્થિતિ અને પાલિકાની કાર્યવાહીના સતત સંપર્કમાં રહો.",
            "emptyTitle": "હજુ સુધી કોઈ સૂચના નથી",
            "emptyDescription": "તમારી પાસે તમામ અપડેટ્સ છે! નવી સૂચનાઓ અહીં દેખાશે.",
            "today": "આજે",
            "earlier": "પહેલાં",
            "total": "કુલ",
            "unread": "ન વંચાયેલ",
            "read": "વંચાયેલ",
            "unreadBadge": "ન વંચાયેલ",
            "loadError": "તમારી સૂચનાઓ લોડ કરવામાં અસમર્થ."
        },
        "userMenu": {
            "accountMenu": "વપરાશકર્તા ખાતું મેનૂ",
            "signOut": "સાઇન આઉટ"
        }
    }
}

PA_DICT = {
    "common": {
        "loading": "ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ...",
        "error": "ਗਲਤੀ",
        "tryAgain": "ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ",
        "back": "ਪਿੱਛੇ",
        "cancel": "ਰੱਦ ਕਰੋ",
        "submit": "ਜਮ੍ਹਾ ਕਰੋ",
        "save": "ਸੰਭਾਲੋ",
        "search": "ਖੋਜੋ",
        "reset": "ਰੀਸੈਟ ਕਰੋ",
        "optional": "ਵਿਕਲਪਿਕ",
        "required": "ਜ਼ਰੂਰੀ",
        "all": "ਸਾਰੇ",
        "viewDetails": "ਵੇਰਵੇ ਦੇਖੋ",
        "backToDashboard": "ਡੈਸ਼ਬੋਰਡ 'ਤੇ ਵਾਪਸ ਜਾਓ",
        "workspace": "ਸਿਵਿਕਫਿਕਸ ਵਰਕਸਪੇਸ",
        "close": "ਬੰਦ ਕਰੋ",
        "activeRole": "ਸਰਗਰਮ ਭੂਮਿਕਾ",
        "workflowPipeline": "ਕਾਰਜ ਪ੍ਰਵਾਹ ਪਾਈਪਲਾਈਨ"
    },
    "nav": {
        "dashboard": "ਡੈਸ਼ਬੋਰਡ",
        "reportIssue": "ਸਮੱਸਿਆ ਦਰਜ ਕਰੋ",
        "myIssues": "ਮੇਰੀਆਂ ਸ਼ਿਕਾਇਤਾਂ",
        "notifications": "ਸੂਚਨਾਵਾਂ",
        "signOut": "ਸਾਈਨ ਆਊਟ",
        "activeRoleDesc": "{{role}} ਕਾਰਜਾਂ ਲਈ ਸਿਵਿਕਫਿਕਸ ਵਰਕਸਪੇਸ।"
    },
    "languages": LANGUAGES_BLOCK,
    "categories": {
        "Pothole": "ਸੜਕ ਦਾ ਟੋਆ",
        "Garbage": "ਕੂੜਾ ਕਰਕਟ",
        "Streetlight": "ਸਟ੍ਰੀਟ ਲਾਈਟ",
        "Water Supply": "ਪਾਣੀ ਦੀ ਸਪਲਾਈ",
        "Drainage": "ਨਿਕਾਸੀ ਪ੍ਰਣਾਲੀ",
        "Road Damage": "ਸੜਕ ਦਾ ਨੁਕਸਾਨ",
        "Traffic/Safety": "ਟ੍ਰੈਫਿਕ / ਸੁਰੱਖਿਆ",
        "Other": "ਹੋਰ"
    },
    "statuses": {
        "SUBMITTED": "ਦਰਜ ਕੀਤੀ ਗਈ",
        "AI_ANALYZED": "AI ਦੁਆਰਾ ਵਿਸ਼ਲੇਸ਼ਣ",
        "AWAITING_ADMIN_CLASSIFICATION": "ਸ਼੍ਰੇਣੀਬੱਧਤਾ ਉਡੀਕ ਅਧੀਨ",
        "CLASSIFIED_SIMPLE": "ਸਧਾਰਨ ਸ਼੍ਰੇਣੀਬੱਧ",
        "CLASSIFIED_COMPLEX": "ਗੁੰਝਲਦਾਰ ਚੁਣੌਤੀ",
        "UNDER_REVIEW": "ਸਮੀਖਿਆ ਅਧੀਨ",
        "TRIAGED": "ਟ੍ਰਾਈਆਜਡ",
        "ASSIGNED": "ਸੌਂਪੀ ਗਈ",
        "IN_PROGRESS": "ਜਾਰੀ ਹੈ",
        "PARTIALLY_COMPLETED": "ਅੰਸ਼ਕ ਤੌਰ 'ਤੇ ਮੁਕੰਮਲ",
        "RESOLVED": "ਹੱਲ ਹੋ ਗਈ",
        "CITIZEN_VERIFIED": "ਨਾਗਰਿਕ ਪ੍ਰਮਾਣਿਤ",
        "VERIFIED": "ਪ੍ਰਮਾਣਿਤ",
        "REOPENED": "ਦੁਬਾਰਾ ਖੋਲ੍ਹੀ ਗਈ",
        "REJECTED": "ਰੱਦ ਕੀਤੀ ਗਈ",
        "ESCALATED_TO_INNOVATION": "ਖੋਜ ਲਈ ਭੇਜੀ ਗਈ"
    },
    "priorities": {
        "LOW": "ਘੱਟ",
        "MEDIUM": "ਦਰਮਿਆਨੀ",
        "HIGH": "ਉੱਚ",
        "URGENT": "ਤੁਰੰਤ",
        "all": "ਸਾਰੀਆਂ ਤਰਜੀਹਾਂ"
    },
    "departments": {
        "Roads & Infrastructure": "ਸੜਕਾਂ ਅਤੇ ਬੁਨਿਆਦੀ ਢਾਂਚਾ",
        "Sanitation & Waste Management": "ਸਫਾਈ ਅਤੇ ਕੂੜਾ ਪ੍ਰਬੰਧਨ",
        "Electricity & Lighting": "ਬਿਜਲੀ ਅਤੇ ਰੋਸ਼ਨੀ",
        "Water Supply & Sewerage": "ਪਾਣੀ ਸਪਲਾਈ ਅਤੇ ਸੀਵਰੇਜ",
        "Public Safety & Traffic": "ਜਨਤਕ ਸੁਰੱਖਿਆ ਅਤੇ ਟ੍ਰੈਫਿਕ",
        "Health & Environment": "ਸਿਹਤ ਅਤੇ ਵਾਤਾਵਰਣ",
        "General Administration": "ਆਮ ਪ੍ਰਸ਼ਾਸਨ"
    },
    "citizen": {
        "dashboard": {
            "tag": "ਨਾਗਰਿਕ ਸੇਵਾ ਕੇਂਦਰ",
            "welcome": "ਜੀ ਆਇਆਂ ਨੂੰ, {{name}}",
            "subtitle": "ਆਪਣੇ ਖੇਤਰ ਦੀਆਂ ਨਾਗਰਿਕ ਸਮੱਸਿਆਵਾਂ ਦੀ ਰਿਪੋਰਟ ਕਰੋ, ਨਗਰ ਨਿਗਮ ਦੀ ਪ੍ਰਗਤੀ ਨੂੰ ਟਰੈਕ ਕਰੋ ਅਤੇ ਹੱਲ ਦੀ ਪੁਸ਼ਟੀ ਕਰੋ।",
            "reportButton": "ਸਮੱਸਿਆ ਰਿਪੋਰਟ ਕਰੋ",
            "viewReportsButton": "ਮੇਰੀਆਂ ਰਿਪੋਰਟਾਂ ਦੇਖੋ",
            "stats": {
                "total": "ਕੁੱਲ ਰਿਪੋਰਟਾਂ",
                "totalDesc": "ਦਰਜ ਕੀਤੀਆਂ ਸਾਰੀਆਂ ਸ਼ਿਕਾਇਤਾਂ",
                "pending": "ਉਡੀਕ ਅਧੀਨ",
                "pendingDesc": "ਨਿਗਮ ਸਮੀਖਿਆ ਦੀ ਉਡੀਕ ਵਿੱਚ",
                "inProgress": "ਕੰਮ ਚਾਲੂ ਹੈ",
                "inProgressDesc": "ਜ਼ਮੀਨੀ ਪੱਧਰ 'ਤੇ ਕਾਰਵਾਈ ਜਾਰੀ",
                "resolved": "ਹੱਲ ਹੋਈਆਂ",
                "resolvedDesc": "ਮੁਕੰਮਲ ਅਤੇ ਪ੍ਰਮਾਣਿਤ"
            },
            "verificationNotice": {
                "single": "1 ਹੱਲ ਹੋਈ ਸਮੱਸਿਆ ਦੀ ਜ਼ਮੀਨੀ ਪੁਸ਼ਟੀ ਲੋੜੀਂਦੀ ਹੈ",
                "multiple": "{{count}} ਹੱਲ ਹੋਈਆਂ ਸਮੱਸਿਆਵਾਂ ਦੀ ਜ਼ਮੀਨੀ ਪੁਸ਼ਟੀ ਲੋੜੀਂਦੀ ਹੈ",
                "description": "ਨਗਰ ਨਿਗਮ ਵੱਲੋਂ ਕੰਮ ਪੂਰਾ ਕਰ ਦਿੱਤਾ ਗਿਆ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਪੁਸ਼ਟੀ ਕਰੋ ਕਿ ਸਮੱਸਿਆ ਹੱਲ ਹੋ ਗਈ ਹੈ।",
                "action": "ਹੁਣੇ ਪੁਸ਼ਟੀ ਕਰੋ"
            },
            "recentActivity": "ਹਾਲੀਆ ਗਤੀਵਿਧੀ",
            "latestReports": "ਤਾਜ਼ਾ ਨਾਗਰਿਕ ਰਿਪੋਰਟਾਂ",
            "viewAll": "ਸਾਰੇ ਦੇਖੋ ({{count}})",
            "impact": {
                "tag": "ਭਾਈਚਾਰਕ ਪ੍ਰਭਾਵ",
                "title": "ਪ੍ਰਸ਼ਾਸਨ ਨੂੰ ਜਵਾਬਦੇਹ ਬਣਾਉਣਾ",
                "description": "ਤੁਹਾਡੀ ਹਰੇਕ ਰਿਪੋਰਟ ਪ੍ਰਸ਼ਾਸਨ ਦੀ ਜਵਾਬਦੇਹੀ ਤੈਅ ਕਰਦੀ ਹੈ ਅਤੇ ਸ਼ਹਿਰ ਨੂੰ ਸਾਫ਼-ਸੁਥਰਾ ਤੇ ਸੁਰੱਖਿਅਤ ਬਣਾਉਂਦੀ ਹੈ।",
                "totalImpact": "ਤੁਹਾਡਾ ਕੁੱਲ ਯੋਗਦਾਨ",
                "reports": "ਰਿਪੋਰਟਾਂ",
                "registry": "ਸ਼ਹਿਰੀ ਰਜਿਸਟਰ ਵਿੱਚ ਦਰਜ",
                "resolutionRate": "ਹੱਲ ਦਰ",
                "resolvedCount": "{{total}} ਵਿੱਚੋਂ {{resolved}} ਹੱਲ"
            },
            "empty": {
                "title": "ਅਜੇ ਕੋਈ ਰਿਪੋਰਟ ਦਰਜ ਨਹੀਂ",
                "description": "ਤੁਸੀਂ ਅਜੇ ਤੱਕ ਕੋਈ ਸਮੱਸਿਆ ਦਰਜ ਨਹੀਂ ਕੀਤੀ। ਆਪਣੇ ਇਲਾਕੇ ਦੀ ਸਮੱਸਿਆ ਦੀ ਤਸਵੀਰ ਖਿੱਚ ਕੇ ਪਹਿਲੀ ਰਿਪੋਰਟ ਦਰਜ ਕਰੋ।",
                "primaryAction": "ਹੁਣੇ ਸਮੱਸਿਆ ਦਰਜ ਕਰੋ",
                "secondaryAction": "ਸਮੱਸਿਆ ਸੂਚੀ ਦੇਖੋ"
            },
            "loadError": "ਤੁਹਾਡੀਆਂ ਰਿਪੋਰਟਾਂ ਲੋਡ ਕਰਨ ਵਿੱਚ ਅਸਮਰੱਥ।"
        },
        "report": {
            "tag": "ਨਾਗਰਿਕ ਸ਼ਿਕਾਇਤ ਦਰਜ",
            "title": "ਨਾਗਰਿਕ ਸਮੱਸਿਆ ਰਿਪੋਰਟ ਕਰੋ",
            "description": "ਬੁਨਿਆਦੀ ਢਾਂਚੇ, ਸਫ਼ਾਈ ਜਾਂ ਸੁਰੱਖਿਆ ਸੰਬੰਧੀ ਸ਼ਿਕਾਇਤ ਦਰਜ ਕਰੋ। ਤੁਹਾਡੀ ਰਿਪੋਰਟ ਸਿੱਧੀ ਸਬੰਧਤ ਅਧਿਕਾਰੀਆਂ ਤੱਕ ਪਹੁੰਚੇਗੀ।",
            "steps": {
                "step1": "1",
                "step1Title": "ਸਮੱਸਿਆ ਦਾ ਵੇਰਵਾ ਦਿਓ",
                "step1Subtitle": "ਤੁਸੀਂ ਕਿਸ ਸਮੱਸਿਆ ਬਾਰੇ ਦੱਸ ਰਹੇ ਹੋ?",
                "step2": "2",
                "step2Title": "ਸਥਾਨ ਨਿਰਧਾਰਿਤ ਕਰੋ",
                "step2Subtitle": "ਸਮੱਸਿਆ ਕਿੱਥੇ ਹੈ?",
                "step3": "3",
                "step3Title": "ਤਸਵੀਰ ਜੋੜੋ",
                "step3Subtitle": "ਸਮੱਸਿਆ ਦਾ ਫੋਟੋ ਸਬੂਤ ਦਿਓ",
                "step4": "4",
                "step4Title": "ਜਮ੍ਹਾ ਕਰਨ ਲਈ ਤਿਆਰ?",
                "step4Subtitle": "ਕਿਰਪਾ ਕਰਕੇ ਜਮ੍ਹਾ ਕਰਨ ਤੋਂ ਪਹਿਲਾਂ ਵੇਰਵੇ ਦੀ ਜਾਂਚ ਕਰੋ।"
            },
            "fields": {
                "titleLabel": "ਸਮੱਸਿਆ ਦਾ ਸਿਰਲੇਖ",
                "titlePlaceholder": "ਜਿਵੇਂ: ਟੁੱਟੀ ਸਟ੍ਰੀਟ ਲਾਈਟ, ਕੂੜੇ ਦਾ ਢੇਰ, ਸੜਕ 'ਤੇ ਡੂੰਘਾ ਟੋਆ",
                "categoryLabel": "ਸ਼੍ਰੇਣੀ",
                "categorySelect": "ਸ਼੍ਰੇਣੀ ਚੁਣੋ",
                "descriptionLabel": "ਵੇਰਵਾ",
                "descriptionPlaceholder": "ਸਮੱਸਿਆ ਬਾਰੇ ਪੂਰੀ ਜਾਣਕਾਰੀ ਦਿਓ: ਸਹੀ ਥਾਂ, ਖ਼ਤਰਾ, ਇਹ ਕਿੰਨੇ ਸਮੇਂ ਤੋਂ ਹੈ...",
                "locationLabel": "ਸਥਾਨ ਅਤੇ ਪਛਾਣ ਚਿੰਨ੍ਹ",
                "locationPlaceholder": "ਜਿਵੇਂ: ਮੈਟਰੋ ਪਿੱਲਰ 142 ਨੇੜੇ, ਜੁਬਲੀ ਹਿਲਜ਼ ਰੋਡ ਨੰਬਰ 36",
                "gpsTitle": "ਜੀਪੀਐਸ ਸਥਾਨ",
                "gpsDescription": "ਕੋਆਰਡੀਨੇਟਸ ਜੋੜਨ ਨਾਲ ਕਰਮਚਾਰੀਆਂ ਨੂੰ ਸਹੀ ਜਗ੍ਹਾ ਤੇਜ਼ੀ ਨਾਲ ਲੱਭਣ ਵਿੱਚ ਮਦਦ ਮਿਲਦੀ ਹੈ।",
                "gpsButton": "ਮੇਰਾ ਮੌਜੂਦਾ ਸਥਾਨ ਵਰਤੋ",
                "gpsDetecting": "ਜੀਪੀਐਸ ਲੱਭ ਰਿਹਾ ਹੈ...",
                "gpsCaptured": "ਸਥਾਨ ਪ੍ਰਾਪਤ: {{lat}}, {{lng}}",
                "gpsAccuracy": " (±{{accuracy}}ਮੀ)",
                "photoUploadTitle": "ਤਸਵੀਰ ਚੁਣਨ ਜਾਂ ਖਿੱਚਣ ਲਈ ਕਲਿੱਕ ਕਰੋ",
                "photoUploadDesc": "JPG, PNG, HEIC, WebP ਸਮਰਥਿਤ। ਅੱਪਲੋਡ ਕਰਨ ਤੋਂ ਪਹਿਲਾਂ ਤਸਵੀਰਾਂ ਆਪਣੇ ਆਪ ਕੰਪ੍ਰੈੱਸ ਹੋ ਜਾਂਦੀਆਂ ਹਨ।",
                "selectFile": "ਫਾਈਲ ਚੁਣੋ",
                "processingFile": "ਪ੍ਰੋਸੈਸਿੰਗ ਹੋ ਰਹੀ ਹੈ...",
                "removePhoto": "ਹਟਾਓ"
            },
            "voice": {
                "speakButton": "ਬੋਲ ਕੇ ਵੇਰਵਾ ਦਿਓ",
                "listening": "ਸੁਣ ਰਿਹਾ ਹੈ... ਹੁਣ ਬੋਲੋ",
                "stop": "ਰੋਕੋ",
                "transcribing": "AI ਰਾਹੀਂ ਟੈਕਸਟ ਤਿਆਰ ਹੋ ਰਿਹਾ ਹੈ...",
                "detectedLanguage": "{{language}} ਵਿੱਚ ਪਛਾਣਿਆ ਗਿਆ",
                "replaceOrAppend": "ਟੈਕਸਟ ਤਿਆਰ ਹੈ। ਹੇਠਾਂ ਸਮੀਖਿਆ ਜਾਂ ਸੋਧ ਕਰੋ।",
                "micPermissionDenied": "ਮਾਈਕ੍ਰੋਫੋਨ ਦੀ ਇਜਾਜ਼ਤ ਨਹੀਂ ਮਿਲੀ। ਕਿਰਪਾ ਕਰਕੇ ਬ੍ਰਾਊਜ਼ਰ ਸੈਟਿੰਗਾਂ ਵਿੱਚ ਇਜਾਜ਼ਤ ਦਿਓ।",
                "micNotSupported": "ਇਸ ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਵੌਇਸ ਰਿਕਾਰਡਿੰਗ ਸਮਰਥਿਤ ਨਹੀਂ ਹੈ।",
                "transcriptionFailed": "ਵੌਇਸ ਰਿਕਾਰਡਿੰਗ ਅਸਫਲ ਰਹੀ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ ਜਾਂ ਟਾਈਪ ਕਰੋ।",
                "reviewTitle": "ਵੌਇਸ ਟੈਕਸਟ ਸਮੀਖਿਆ",
                "originalTextLabel": "ਮੂਲ ਬੋਲਿਆ ਟੈਕਸਟ",
                "englishTranslationLabel": "ਅੰਗਰੇਜ਼ੀ ਅਨੁਵਾਦ",
                "useTranscription": "ਇਹ ਟੈਕਸਟ ਵਰਤੋ",
                "recordAgain": "ਦੁਬਾਰਾ ਰਿਕਾਰਡ ਕਰੋ",
                "discard": "ਰੱਦ ਕਰੋ"
            },
            "stages": {
                "idle": "ਜਮ੍ਹਾ ਕਰਨ ਲਈ ਤਿਆਰ",
                "saving": "ਸਮੱਸਿਆ ਦਰਜ ਹੋ ਰਹੀ ਹੈ...",
                "uploading": "ਤਸਵੀਰ ਅੱਪਲੋਡ ਹੋ ਰਹੀ ਹੈ...",
                "finalizing": "ਰਿਪੋਰਟ ਮੁਕੰਮਲ ਕੀਤੀ ਜਾ ਰਹੀ ਹੈ..."
            },
            "submitButton": "ਨਾਗਰਿਕ ਰਿਪੋਰਟ ਜਮ੍ਹਾ ਕਰੋ",
            "successModal": {
                "tag": "ਰਿਪੋਰਟ ਸਫਲਤਾਪੂਰਵਕ ਦਰਜ ਹੋਈ",
                "title": "ਤੁਹਾਡੀ ਨਾਗਰਿਕ ਰਿਪੋਰਟ ਦਰਜ ਹੋ ਗਈ ਹੈ!",
                "refText": "ਸਿਵਿਕਫਿਕਸ ਨੇ ਤੁਹਾਡੀ ਰਿਪੋਰਟ ਦਰਜ ਕਰ ਲਈ ਹੈ ਅਤੇ ਹਵਾਲਾ ਨੰਬਰ ਜਾਰੀ ਕੀਤਾ ਹੈ",
                "summary": "ਰਿਪੋਰਟ ਸਾਰਾਂਸ਼",
                "titleField": "ਸਿਰਲੇਖ",
                "categoryField": "ਸ਼੍ਰੇਣੀ",
                "statusField": "ਸਥਿਤੀ",
                "submittedAtField": "ਦਰਜ ਕਰਨ ਦਾ ਸਮਾਂ",
                "viewIssue": "ਮੇਰੀ ਸਮੱਸਿਆ ਦੇਖੋ",
                "backToDashboard": "ਡੈਸ਼ਬੋਰਡ 'ਤੇ ਵਾਪਸ ਜਾਓ"
            },
            "partialErrorModal": {
                "tag": "ਸੂਚਨਾ ਨਾਲ ਰਿਪੋਰਟ ਸੁਰੱਖਿਅਤ",
                "title": "ਤੁਹਾਡੀ ਰਿਪੋਰਟ ਬਣ ਗਈ ਹੈ",
                "description": "ਸਮੱਸਿਆ ਡੇਟਾਬੇਸ ਵਿੱਚ ਦਰਜ ਹੋ ਗਈ ਹੈ, ਪਰ ਤਸਵੀਰ ਅੱਪਲੋਡ ਪੂਰੀ ਨਹੀਂ ਹੋ ਸਕੀ।",
                "viewIssues": "ਮੇਰੀਆਂ ਸ਼ਿਕਾਇਤਾਂ ਦੇਖੋ",
                "backToDashboard": "ਡੈਸ਼ਬੋਰਡ 'ਤੇ ਵਾਪਸ ਜਾਓ"
            },
            "validation": {
                "title": "ਕਿਰਪਾ ਕਰਕੇ ਸਮੱਸਿਆ ਦਾ ਸਿਰਲੇਖ ਦਿਓ।",
                "description": "ਕਿਰਪਾ ਕਰਕੇ ਸਮੱਸਿਆ ਦਾ ਵੇਰਵਾ ਦਿਓ।",
                "category": "ਕਿਰਪਾ ਕਰਕੇ ਇੱਕ ਸ਼੍ਰੇਣੀ ਚੁਣੋ।",
                "location": "ਕਿਰਪਾ ਕਰਕੇ ਸਥਾਨ ਜਾਂ ਪਛਾਣ ਚਿੰਨ੍ਹ ਦਰਜ ਕਰੋ।",
                "image": "ਕਿਰਪਾ ਕਰਕੇ ਇੱਕ JPG, PNG, HEIC ਜਾਂ WebP ਤਸਵੀਰ ਚੁਣੋ।"
            }
        },
        "issues": {
            "tag": "ਸ਼ਿਕਾਇਤ ਰਜਿਸਟਰ",
            "title": "ਮੇਰੀਆਂ ਨਾਗਰਿਕ ਸ਼ਿਕਾਇਤਾਂ",
            "description": "ਆਪਣੇ ਸ਼ਹਿਰ ਵਿੱਚ ਦਰਜ ਹਰ ਸ਼ਿਕਾਇਤ ਨੂੰ ਖੋਜੋ, ਫਿਲਟਰ ਕਰੋ ਅਤੇ ਇਸਦੀ ਪ੍ਰਗਤੀ 'ਤੇ ਨਜ਼ਰ ਰੱਖੋ।",
            "reportButton": "ਸਮੱਸਿਆ ਦਰਜ ਕਰੋ",
            "searchPlaceholder": "ਸਿਰਲੇਖ, ਸਥਾਨ, ਸ਼੍ਰੇਣੀ, ਵੇਰਵੇ ਦੁਆਰਾ ਖੋਜੋ...",
            "sortNewest": "ਨਵੀਂ ਪਹਿਲਾਂ",
            "sortOldest": "ਪੁਰਾਣੀ ਪਹਿਲਾਂ",
            "filtersSort": "ਫਿਲਟਰ ਅਤੇ ਕ੍ਰਮਬੱਧਤਾ",
            "resetFilters": "ਫਿਲਟਰ ਰੀਸੈਟ ਕਰੋ",
            "showingCount": "{{total}} ਵਿੱਚੋਂ {{filtered}} ਰਿਪੋਰਟਾਂ ਦਿਖਾਈਆਂ ਜਾ ਰਹੀਆਂ ਹਨ",
            "sortedBy": "ਕ੍ਰਮ: {{order}}",
            "empty": {
                "noReports": "ਕੋਈ ਰਿਪੋਰਟ ਨਹੀਂ ਮਿਲੀ",
                "noReportsDesc": "ਤੁਸੀਂ ਅਜੇ ਤੱਕ ਕੋਈ ਸ਼ਿਕਾਇਤ ਦਰਜ ਨਹੀਂ ਕੀਤੀ। ਪਹਿਲੀ ਸਿਵਿਕਫਿਕਸ ਰਿਪੋਰਟ ਬਣਾ ਕੇ ਸ਼ੁਰੂਆਤ ਕਰੋ।",
                "noMatches": "ਕੋਈ ਮਿਲਦੀ ਸਮੱਸਿਆ ਨਹੀਂ",
                "noMatchesDesc": "ਮੌਜੂਦਾ ਖੋਜ ਜਾਂ ਫਿਲਟਰ ਨਾਲ ਕੋਈ ਸ਼ਿਕਾਇਤ ਮੇਲ ਨਹੀਂ ਖਾਂਦੀ। ਫਿਲਟਰ ਰੀਸੈਟ ਕਰਕੇ ਦੇਖੋ।"
            },
            "filterLabels": {
                "all": "ਸਾਰੇ",
                "pending": "ਬਾਕੀ",
                "verified": "ਪ੍ਰਮਾਣਿਤ",
                "inProgress": "ਜਾਰੀ",
                "resolved": "ਹੱਲ ਹੋਈ",
                "reopened": "ਦੁਬਾਰਾ ਖੋਲ੍ਹੀ",
                "rejected": "ਰੱਦ ਕੀਤੀ"
            }
        },
        "issueDetails": {
            "backToReports": "ਮੇਰੀਆਂ ਰਿਪੋਰਟਾਂ 'ਤੇ ਵਾਪਸ",
            "reportedOn": "{{date}} ਨੂੰ ਦਰਜ ਕੀਤੀ ਗਈ",
            "reference": "ਹਵਾਲਾ #{{id}}",
            "descriptionSection": "ਸਮੱਸਿਆ ਦਾ ਵੇਰਵਾ",
            "locationSection": "ਸਥਾਨ ਦੀ ਜਾਣਕਾਰੀ",
            "landmark": "ਪਛਾਣ ਚਿੰਨ੍ਹ / ਪਤਾ",
            "coordinates": "ਜੀਪੀਐਸ ਕੋਆਰਡੀਨੇਟਸ",
            "openMap": "ਨਕਸ਼ੇ ਵਿੱਚ ਖੋਲ੍ਹੋ",
            "photoSection": "ਤਸਵੀਰ ਸਬੂਤ",
            "initialPhoto": "ਨਾਗਰਿਕ ਦੁਆਰਾ ਦਿੱਤੀ ਤਸਵੀਰ",
            "resolutionPhoto": "ਹੱਲ ਦਾ ਸਬੂਤ ਤਸਵੀਰ",
            "timelineSection": "ਪ੍ਰਗਤੀ ਅਤੇ ਸਥਿਤੀ ਦਾ ਇਤਿਹਾਸ",
            "deptAssignment": "ਸੌਂਪਿਆ ਗਿਆ ਵਿਭਾਗ",
            "originalLanguage": "ਮੂਲ ਭਾਸ਼ਾ",
            "inputMethod": "ਦਰਜ ਕਰਨ ਦਾ ਤਰੀਕਾ",
            "voiceInput": "ਵੌਇਸ ਰਿਕਾਰਡਿੰਗ",
            "textInput": "ਲਿਖਤੀ ਟੈਕਸਟ",
            "viewEnglish": "ਅੰਗਰੇਜ਼ੀ ਅਨੁਵਾਦ ਦੇਖੋ",
            "viewOriginal": "ਮੂਲ ਦੇਖੋ ({{lang}})",
            "canonicalNotice": "ਇਹ ਰਿਪੋਰਟ {{lang}} ਵਿੱਚ ਦਰਜ ਕੀਤੀ ਗਈ ਸੀ ਅਤੇ ਨਿਗਮ ਦੇ ਕੰਮ ਲਈ ਅੰਗਰੇਜ਼ੀ ਵਿੱਚ ਅਨੁਵਾਦ ਕੀਤੀ ਗਈ ਹੈ।",
            "verificationCard": {
                "title": "ਜ਼ਮੀਨੀ ਪੁਸ਼ਟੀ ਲੋੜੀਂਦੀ ਹੈ",
                "description": "ਨਗਰ ਨਿਗਮ ਟੀਮ ਨੇ ਇਸ ਸਮੱਸਿਆ ਨੂੰ ਹੱਲ ਵਜੋਂ ਚਿੰਨ੍ਹਿਤ ਕੀਤਾ ਹੈ। ਕੀ ਸਮੱਸਿਆ ਸੱਚਮੁੱਚ ਹੱਲ ਹੋ ਗਈ ਹੈ?",
                "yesButton": "ਹਾਂ, ਸਮੱਸਿਆ ਹੱਲ ਹੋ ਗਈ ਹੈ",
                "noButton": "ਨਹੀਂ, ਅਜੇ ਵੀ ਸਮੱਸਿਆ ਹੈ (ਦੁਬਾਰਾ ਖੋਲ੍ਹੋ)",
                "verifiedYes": "ਤੁਸੀਂ ਸਮੱਸਿਆ ਹੱਲ ਹੋਣ ਦੀ ਪੁਸ਼ਟੀ ਕੀਤੀ। ਧੰਨਵਾਦ!",
                "verifiedNo": "ਤੁਸੀਂ ਦੱਸਿਆ ਕਿ ਸਮੱਸਿਆ ਹੱਲ ਨਹੀਂ ਹੋਈ। ਇਸਨੂੰ ਦੁਬਾਰਾ ਖੋਲ੍ਹ ਦਿੱਤਾ ਗਿਆ ਹੈ।"
            },
            "reopenModal": {
                "title": "ਸ਼ਿਕਾਇਤ ਦੁਬਾਰਾ ਖੋਲ੍ਹੋ",
                "description": "ਕਿਰਪਾ ਕਰਕੇ ਕਾਰਨ ਦੱਸੋ ਤਾਂ ਜੋ ਕਰਮਚਾਰੀ ਸੁਧਾਰਾਤਮਕ ਕਾਰਵਾਈ ਕਰ ਸਕਣ।",
                "feedbackLabel": "ਦੁਬਾਰਾ ਖੋਲ੍ਹਣ ਦਾ ਕਾਰਨ",
                "feedbackPlaceholder": "ਜਿਵੇਂ: ਲਾਈਟ ਠੀਕ ਕੀਤੀ ਗਈ ਸੀ ਪਰ ਅਗਲੀ ਰਾਤ ਫਿਰ ਬੰਦ ਹੋ ਗਈ...",
                "submitReopen": "ਸ਼ਿਕਾਇਤ ਦੁਬਾਰਾ ਖੋਲ੍ਹੋ",
                "cancel": "ਰੱਦ ਕਰੋ"
            }
        },
        "notifications": {
            "tag": "ਸੂਚਨਾ ਕੇਂਦਰ",
            "title": "ਨਾਗਰਿਕ ਚੇਤਾਵਨੀਆਂ ਅਤੇ ਅੱਪਡੇਟ",
            "description": "ਆਪਣੀਆਂ ਦਰਜ ਕੀਤੀਆਂ ਸਮੱਸਿਆਵਾਂ ਦੀ ਸਥਿਤੀ ਅਤੇ ਨਿਗਮ ਦੀ ਕਾਰਵਾਈ ਨਾਲ ਜੁੜੇ ਰਹੋ।",
            "emptyTitle": "ਅਜੇ ਕੋਈ ਸੂਚਨਾ ਨਹੀਂ ਹੈ",
            "emptyDescription": "ਤੁਸੀਂ ਪੂਰੀ ਤਰ੍ਹਾਂ ਅੱਪਡੇਟ ਹੋ! ਨਵੀਆਂ ਸੂਚਨਾਵਾਂ ਇੱਥੇ ਦਿਖਾਈ ਦੇਣਗੀਆਂ।",
            "today": "ਅੱਜ",
            "earlier": "ਪਹਿਲਾਂ",
            "total": "ਕੁੱਲ",
            "unread": "ਅਣਪੜ੍ਹੇ",
            "read": "ਪੜ੍ਹੇ ਗਏ",
            "unreadBadge": "ਅਣਪੜ੍ਹੇ",
            "loadError": "ਤੁਹਾਡੀਆਂ ਸੂਚਨਾਵਾਂ ਲੋਡ ਕਰਨ ਵਿੱਚ ਅਸਮਰੱਥ।"
        },
        "userMenu": {
            "accountMenu": "ਉਪਭੋਗਤਾ ਖਾਤਾ ਮੀਨੂ",
            "signOut": "ਸਾਈਨ ਆਊਟ"
        }
    }
}
