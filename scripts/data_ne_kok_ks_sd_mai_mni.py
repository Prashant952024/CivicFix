# -*- coding: utf-8 -*-
from data_hi_mr import LANGUAGES_BLOCK

NE_DICT = {
    "common": {
        "loading": "लोड हुँदैछ...",
        "error": "त्रुटि",
        "tryAgain": "पुनः प्रयास गर्नुहोस्",
        "back": "पछाडि",
        "cancel": "रद्द गर्नुहोस्",
        "submit": "पेश गर्नुहोस्",
        "save": "सुरक्षित गर्नुहोस्",
        "search": "खोज्नुहोस्",
        "reset": "रिसेट गर्नुहोस्",
        "optional": "ऐच्छिक",
        "required": "आवश्यक",
        "all": "सबै",
        "viewDetails": "विवरण हेर्नुहोस्",
        "backToDashboard": "ड्यासबோர্ডमा फर्कनुहोस्",
        "workspace": "CivicFix कार्यक्षेत्र",
        "close": "बन्द गर्नुहोस्",
        "activeRole": "सक्रिय भूमिका",
        "workflowPipeline": "कार्यप्रवाह पाइपलाइन"
    },
    "nav": {
        "dashboard": "ड्यासबோர्ड",
        "reportIssue": "समस्या दर्ता गर्नुहोस्",
        "myIssues": "मेरा उजुरीहरू",
        "notifications": "सूचनाहरू",
        "signOut": "साइन आउट",
        "activeRoleDesc": "{{role}} सञ्चालनका लागि CivicFix कार्यक्षेत्र।"
    },
    "languages": LANGUAGES_BLOCK,
    "categories": {
        "Pothole": "सडकको खाल्डो",
        "Garbage": "फोहोरमैला",
        "Streetlight": "सडक बत्ती",
        "Water Supply": "खानेपानी आपूर्ति",
        "Drainage": "ढल निकास",
        "Road Damage": "सडक क्षति",
        "Traffic/Safety": "ट्राफिक / सुरक्षा",
        "Other": "अन्य"
    },
    "statuses": {
        "SUBMITTED": "दर्ता भयो",
        "AI_ANALYZED": "AI द्वारा विश्लेषण गरिएको",
        "AWAITING_ADMIN_CLASSIFICATION": "वर्गीकरण प्रतीक्षामा",
        "CLASSIFIED_SIMPLE": "सामान्य वर्गीकृत",
        "CLASSIFIED_COMPLEX": "जटिल चुनौती",
        "UNDER_REVIEW": "समीक्षाधीन",
        "TRIAGED": "वर्गीकरण सम्पन्न",
        "ASSIGNED": "जिम्मा दिइएको",
        "IN_PROGRESS": "कार्य प्रगतिमा",
        "PARTIALLY_COMPLETED": "आंशिक सम्पन्न",
        "RESOLVED": "समाधान भयो",
        "CITIZEN_VERIFIED": "नागरिक प्रमाणित",
        "VERIFIED": "प्रमाणित",
        "REOPENED": "पुनः खोलियो",
        "REJECTED": "अस्वीकृत",
        "ESCALATED_TO_INNOVATION": "अनुसन्धानमा पठाइयो"
    },
    "priorities": {
        "LOW": "न्यून",
        "MEDIUM": "मध्यम",
        "HIGH": "उच्च",
        "URGENT": "अति जरुरी",
        "all": "सबै प्राथमिकताहरू"
    },
    "departments": {
        "Roads & Infrastructure": "सडक तथा पूर्वाधार",
        "Sanitation & Waste Management": "सरसफाइ तथा फोहोर व्यवस्थापन",
        "Electricity & Lighting": "विद्युत तथा सडक बत्ती",
        "Water Supply & Sewerage": "खानेपानी तथा ढल निकास",
        "Public Safety & Traffic": "सार्वजनिक सुरक्षा तथा ट्राफिक",
        "Health & Environment": "स्वास्थ्य तथा वातावरण",
        "General Administration": "सामान्य प्रशासन"
    },
    "citizen": {
        "dashboard": {
            "tag": "नागरिक सेवा केन्द्र",
            "welcome": "स्वागत छ, {{name}}",
            "subtitle": "आफ्नो क्षेत्रका नागरिक समस्याहरू रिपोर्ट गर्नुहोस्, नगरपालिकाको प्रगति ट्र्याक गर्नुहोस् र समाधानको पुष्टि गर्नुहोस्।",
            "reportButton": "समस्या दर्ता गर्नुहोस्",
            "viewReportsButton": "मेरा उजुरीहरू हेर्नुहोस्",
            "stats": {
                "total": "कुल उजुरी",
                "totalDesc": "दर्ता गरिएका सबै नागरिक समस्याहरू",
                "pending": "समीक्षा प्रतीक्षामा",
                "pendingDesc": "नगरपालिकाको निर्णयको पर्खाइमा",
                "inProgress": "प्रगतिमा छ",
                "inProgressDesc": "कार्यक्षेत्रमा काम भइरहेको",
                "resolved": "समाधान भयो",
                "resolvedDesc": "सम्पन्न र प्रमाणित"
            },
            "verificationNotice": {
                "single": "1 समाधान भएको समस्यामा तपाईंको स्थलगत प्रमाणीकरण आवश्यक छ",
                "multiple": "{{count}} समाधान भएका समस्याहरूमा तपाईंको स्थलगत प्रमाणीकरण आवश्यक छ",
                "description": "नगरपालिकाको काम सम्पन्न भएको छ। समस्या समाधान भयो कि भएन कृपया पुष्टि गर्नुहोस्।",
                "action": "अहिले नै प्रमाणीकरण गर्नुहोस्"
            },
            "recentActivity": "हालैका गतिविधि",
            "latestReports": "ताजा नागरिक रिपोर्टहरू",
            "viewAll": "सबै हेर्नुहोस् ({{count}})",
            "impact": {
                "tag": "सामुदायिक प्रभाव",
                "title": "नगरपालिकालाई जवाफदेही बनाउने",
                "description": "तपाईंको प्रत्येक रिपोर्टले प्रशासनलाई जिम्मेवार बनाउँछ र शहरलाई सफा र सुरक्षित राख्न मद्दत गर्दछ।",
                "totalImpact": "तपाईंको कुल योगदान",
                "reports": "उजुरीहरू",
                "registry": "नगर दर्तामा समावेश",
                "resolutionRate": "समाधान दर",
                "resolvedCount": "{{total}} मध्ये {{resolved}} समाधान"
            },
            "empty": {
                "title": "अहिलेसम्म कुनै उजुरी दर्ता भएको छैन",
                "description": "तपाईंले अहिलेसम्म कुनै समस्या दर्ता गर्नुभएको छैन। आफ्नो क्षेत्रको समस्याको फोटो खिचेर पहिलो रिपोर्ट दर्ता गर्नुहोस्।",
                "primaryAction": "अहिले नै समस्या दर्ता गर्नुहोस्",
                "secondaryAction": "समस्या सूची हेर्नुहोस्"
            },
            "loadError": "तपाईंका रिपोर्टहरू लोड गर्न सकिएन।"
        },
        "report": {
            "tag": "नागरिक उजुरी दर्ता",
            "title": "नागरिक समस्या दर्ता गर्नुहोस्",
            "description": "पूर्वाधार, सरसफाइ वा सुरक्षा सम्बन्धी उजुरी दर्ता गर्नुहोस्। तपाईंको रिपोर्ट सिधै सम्बन्धित अधिकारीहरूकहाँ पुग्नेछ।",
            "steps": {
                "step1": "१",
                "step1Title": "समस्याको विवरण दिनुहोस्",
                "step1Subtitle": "तपाईं कुन समस्याको रिपोर्ट गर्दै हुनुहुन्छ?",
                "step2": "२",
                "step2Title": "स्थान निर्दिष्ट गर्नुहोस्",
                "step2Subtitle": "समस्या कहाँ छ?",
                "step3": "३",
                "step3Title": "फोटो संलग्न गर्नुहोस्",
                "step3Subtitle": "समस्याको फोटो प्रमाण दिनुहोस्",
                "step4": "४",
                "step4Title": "पेश गर्न तयार हुनुहुन्छ?",
                "step4Subtitle": "पेश गर्नुअघि कृपया माथिका विवरणहरू जाँच गर्नुहोस्।"
            },
            "fields": {
                "titleLabel": "समस्याको शीर्षक",
                "titlePlaceholder": "जस्तै: बिग्रिएको सडक बत्ती, फोहोरको थुप्रो, सडकको गहिरो खाल्डो",
                "categoryLabel": "वर्ग",
                "categorySelect": "एउटा वर्ग छान्नुहोस्",
                "descriptionLabel": "विस्तृत विवरण",
                "descriptionPlaceholder": "समस्याको पूरा विवरण दिनुहोस्: निश्चित स्थान, जोखिम, कति समयदेखि छ...",
                "locationLabel": "स्थान र चिनारी",
                "locationPlaceholder": "जस्तै: मेट्रो पिलर १४२ नजिक, जुबिली हिल्स रोड नं ३६",
                "gpsTitle": "GPS स्थान",
                "gpsDescription": "स्थान निर्देशांक जोड्दा कर्मचारीहरूलाई छिट्टै ठाउँ पत्ता लगाउन मद्दत पुग्छ।",
                "gpsButton": "मेरो हालको स्थान प्रयोग गर्नुहोस्",
                "gpsDetecting": "GPS खोजिँदैछ...",
                "gpsCaptured": "स्थान प्राप्त: {{lat}}, {{lng}}",
                "gpsAccuracy": " (±{{accuracy}}मि)",
                "photoUploadTitle": "फोटो खिच्न वा छनोट गर्न क्लिक गर्नुहोस्",
                "photoUploadDesc": "JPG, PNG, HEIC, WebP समर्थित। अपलोड हुनुअघि फोटोहरू स्वचालित रूपमा कम्प्रेस हुन्छन्।",
                "selectFile": "फाइल छान्नुहोस्",
                "processingFile": "प्रक्रिया हुँदैछ...",
                "removePhoto": "हटाउनुहोस्"
            },
            "voice": {
                "speakButton": "बोलेर विवरण दिनुहोस्",
                "listening": "सुन्दैछ... अब बोल्नुहोस्",
                "stop": "रोक्नुहोस्",
                "transcribing": "AI द्वारा पाठमा रूपान्तरण गरिँदैछ...",
                "detectedLanguage": "{{language}} भाषामा पहिचान",
                "replaceOrAppend": "पाठ तयार भयो। तल जाँच गर्नुहोस् वा सम्पादन गर्नुहोस्।",
                "micPermissionDenied": "माइक्रोफोन अनुमति अस्वीकृत। ब्राउजर सेटिङमा अनुमति दिनुहोस्।",
                "micNotSupported": "यस ब्राउजरमा भ्वाइस रेकर्डिङ सुविधा छैन।",
                "transcriptionFailed": "भ्वाइस रूपान्तरण असफल भयो। पुनः प्रयास गर्नुहोस् वा टाइप गर्नुहोस्।",
                "reviewTitle": "भ्वाइस पाठ समीक्षा",
                "originalTextLabel": "मूल बोलिएको पाठ",
                "englishTranslationLabel": "अंग्रेजी अनुवाद",
                "useTranscription": "यो पाठ प्रयोग गर्नुहोस्",
                "recordAgain": "पुनः रेकर्ड गर्नुहोस्",
                "discard": "रद्द गर्नुहोस्"
            },
            "stages": {
                "idle": "पेश गर्न तयार",
                "saving": "समस्या दर्ता गरिँदैछ...",
                "uploading": "फोटो अपलोड हुँदैछ...",
                "finalizing": "रिपोर्ट अन्तिम गरिँदैछ..."
            },
            "submitButton": "नागरिक रिपोर्ट पेश गर्नुहोस्",
            "successModal": {
                "tag": "रिपोर्ट सफलतापूर्वक दर्ता भयो",
                "title": "तपाईंको नागरिक रिपोर्ट दर्ता भयो!",
                "refText": "CivicFix ले तपाईंको रिपोर्ट दर्ता गरी सन्दर्भ नम्बर प्रदान गरेको छ",
                "summary": "रिपोर्ट सारांश",
                "titleField": "शीर्षक",
                "categoryField": "वर्ग",
                "statusField": "स्थिति",
                "submittedAtField": "दर्ता समय",
                "viewIssue": "मेरो समस्या हेर्नुहोस्",
                "backToDashboard": "ड्यासबோர্ডमा फर्कनुहोस्"
            },
            "partialErrorModal": {
                "tag": "सूचना सहित रिपोर्ट सुरक्षित",
                "title": "तपाईंको रिपोर्ट सिर्जना भयो",
                "description": "समस्या डेटाबेसमा दर्ता भयो, तर फोटो अपलोड पूरा हुन सकेन।",
                "viewIssues": "मेरा उजुरीहरू हेर्नुहोस्",
                "backToDashboard": "ड्यासबோர্ডमा फर्कनुहोस्"
            },
            "validation": {
                "title": "कृपया समस्याको शीर्षक दिनुहोस्।",
                "description": "कृपया समस्याको विवरण दिनुहोस्।",
                "category": "कृपया एउटा वर्ग छान्नुहोस्।",
                "location": "कृपया स्थान वा चिनारी उल्लेख गर्नुहोस्।",
                "image": "कृपया एउटा JPG, PNG, HEIC वा WebP फोटो छान्नुहोस्।"
            }
        },
        "issues": {
            "tag": "उजुरी दर्ता किताब",
            "title": "मेरा नागरिक उजुरीहरू",
            "description": "तपाईंको शहरमा दर्ता गरिएका प्रत्येक उजुरी खोज्नुहोस्, फिल्टर गर्नुहोस् र निगरानी गर्नुहोस्।",
            "reportButton": "समस्या दर्ता गर्नुहोस्",
            "searchPlaceholder": "शीर्षक, स्थान, वर्ग, विवरणबाट खोज्नुहोस्...",
            "sortNewest": "नयाँ पहिले",
            "sortOldest": "पुरानो पहिले",
            "filtersSort": "फिल्टर र क्रमबद्धता",
            "resetFilters": "फिल्टर रिसेट गर्नुहोस्",
            "showingCount": "{{total}} मध्ये {{filtered}} उजुरीहरू देखाइएको छ",
            "sortedBy": "क्रम: {{order}}",
            "empty": {
                "noReports": "कुनै उजुरी फेला परेन",
                "noReportsDesc": "तपाईंले अहिलेसम्म कुनै उजुरी दर्ता गर्नुभएको छैन। पहिलो CivicFix रिपोर्ट बनाएर सुरु गर्नुहोस्।",
                "noMatches": "मिल्दो उजुरी फेला परेन",
                "noMatchesDesc": "हालको खोज अनुसार कुनै उजुरी भेटिएन। फिल्टर परिवर्तन गरी हेर्नुहोस्।"
            },
            "filterLabels": {
                "all": "सबै",
                "pending": "बाँकी",
                "verified": "प्रमाणित",
                "inProgress": "प्रगतिमा",
                "resolved": "समाधान भयो",
                "reopened": "पुनः खोलियो",
                "rejected": "अस्वीकृत"
            }
        },
        "issueDetails": {
            "backToReports": "मेरा उजुरीहरूमा फर्कनुहोस्",
            "reportedOn": "{{date}} मा दर्ता गरिएको",
            "reference": "सन्दर्भ #{{id}}",
            "descriptionSection": "समस्या विवरण",
            "locationSection": "स्थान जानकारी",
            "landmark": "चिनारी / ठेगाना",
            "coordinates": "GPS निर्देशांक",
            "openMap": "नक्सामा हेर्नुहोस्",
            "photoSection": "फोटो प्रमाण",
            "initialPhoto": "नागरिकले पेश गरेको फोटो",
            "resolutionPhoto": "समाधानको प्रमाण फोटो",
            "timelineSection": "प्रगति र इतिहास",
            "deptAssignment": "जिम्मेवार विभाग",
            "originalLanguage": "मूल भाषा",
            "inputMethod": "पेश गर्ने माध्यम",
            "voiceInput": "भ्वाइस रेकर्डिङ",
            "textInput": "लिखित पाठ",
            "viewEnglish": "अंग्रेजी अनुवाद हेर्नुहोस्",
            "viewOriginal": "मूल हेर्नुहोस् ({{lang}})",
            "canonicalNotice": "यो रिपोर्ट {{lang}} मा दर्ता गरिएको थियो र प्रशासनिक कामका लागि अंग्रेजीमा अनुवाद गरिएको छ।",
            "verificationCard": {
                "title": "स्थलगत प्रमाणीकरण आवश्यक",
                "description": "नगरपालिका टोलीले यो समस्या समाधान भएको भनी चिन्ह लगाएको छ। के स्थलमा समस्या साँच्चै समाधान भएको छ?",
                "yesButton": "हो, समस्या समाधान भयो",
                "noButton": "होइन, अझै समस्या छ (पुनः खोल्नुहोस्)",
                "verifiedYes": "तपाईंले समस्या समाधान भएको पुष्टि गर्नुभयो। धन्यवाद!",
                "verifiedNo": "तपाईंले समस्या समाधान नभएको जानकारी दिनुभयो। यसलाई पुनः अनुसन्धानमा पठाइएको छ।"
            },
            "reopenModal": {
                "title": "उजुरी पुनः खोल्नुहोस्",
                "description": "कर्मचारीहरूले सुधारात्मक कदम चाल्न सकून् भनी कारण स्पष्ट गर्नुहोस्।",
                "feedbackLabel": "पुनः खोल्नुको कारण",
                "feedbackPlaceholder": "जस्तै: बत्ती मर्मत गरिएको थियो तर भोलिपल्टै फेरि निभ्यो...",
                "submitReopen": "उजुरी पुनः खोल्नुहोस्",
                "cancel": "रद्द गर्नुहोस्"
            }
        },
        "notifications": {
            "tag": "सूचना केन्द्र",
            "title": "नागरिक सूचनाहरू तथा अपडेटहरू",
            "description": "तपाईंका उजुरीहरूको स्थिति र नगरपालिकाका कदमहरूबारे जानकारी पाउनुहोस्।",
            "emptyTitle": "अहिले कुनै सूचना छैन",
            "emptyDescription": "तपाईंले सबै अपडेटहरू हेरिसक्नुभएको छ! नयाँ सूचनाहरू यहाँ देखिनेछन्।",
            "today": "आज",
            "earlier": "पहिले",
            "total": "कुल",
            "unread": "नपढिएको",
            "read": "पढिएको",
            "unreadBadge": "नपढिएको",
            "loadError": "सूचनाहरू लोड गर्न सकिएन।"
        },
        "userMenu": {
            "accountMenu": "प्रयोगकर्ता खाता मेनु",
            "signOut": "साइन आउट"
        }
    }
}

KOK_DICT = {
    "common": {
        "loading": "लोड जाता...",
        "error": "चूक",
        "tryAgain": "परत प्रयत्न करात",
        "back": "फाटीं",
        "cancel": "रद्द करात",
        "submit": "सादर करात",
        "save": "सांभाळात",
        "search": "सोधात",
        "reset": "परत स्थापीत करात",
        "optional": "ऐच्छिक",
        "required": "गरजेचे",
        "all": "सगळे",
        "viewDetails": "तपशील पळयात",
        "backToDashboard": "डॅशबोर्डार परत वचात",
        "workspace": "CivicFix कार्यक्षेत्र",
        "close": "बंद करात",
        "activeRole": "सक्रिय भूमिका",
        "workflowPipeline": "कामकाज प्रवाह"
    },
    "nav": {
        "dashboard": "डॅशबोर्ड",
        "reportIssue": "समस्या नोंदयात",
        "myIssues": "म्हज्यो कागाळी",
        "notifications": "सूचना",
        "signOut": "साइन आउट",
        "activeRoleDesc": "{{role}} कामकाजा खातीर CivicFix कार्यक्षेत्र."
    },
    "languages": LANGUAGES_BLOCK,
    "categories": {
        "Pothole": "रस्त्याचो खड्डो",
        "Garbage": "कचरो",
        "Streetlight": "रस्त्याचो दिवो",
        "Water Supply": "उदका पुरवण",
        "Drainage": "निस्सारण / गटार",
        "Road Damage": "रस्तो इबाड",
        "Traffic/Safety": "येरादारी / सुरक्षा",
        "Other": "हेर"
    },
    "statuses": {
        "SUBMITTED": "नोंद जाली",
        "AI_ANALYZED": "AI द्वारे विश्लेषीत",
        "AWAITING_ADMIN_CLASSIFICATION": "वर्गीकरण प्रतिक्षेंत",
        "CLASSIFIED_SIMPLE": "सादी कागाळ",
        "CLASSIFIED_COMPLEX": "गुंतागुंतीचें आव्हान",
        "UNDER_REVIEW": "तपासणेंत",
        "TRIAGED": "वर्गीकृत",
        "ASSIGNED": "नेमून दिलें",
        "IN_PROGRESS": "काम चालू आसा",
        "PARTIALLY_COMPLETED": "कांय प्रमाणांत जालें",
        "RESOLVED": "निवारण जालें",
        "CITIZEN_VERIFIED": "नागरिक तपासणीकृत",
        "VERIFIED": "तपासलें",
        "REOPENED": "परत उक्ती केली",
        "REJECTED": "नकारली",
        "ESCALATED_TO_INNOVATION": "संशोधनाक धाडली"
    },
    "priorities": {
        "LOW": "उणी",
        "MEDIUM": "मध्यम",
        "HIGH": "उच्च",
        "URGENT": "तात्काळ",
        "all": "सगळे प्राधान्यक्रम"
    },
    "departments": {
        "Roads & Infrastructure": "रस्ते आनी पायाभूत सुविधा",
        "Sanitation & Waste Management": "स्वच्छता आनी कचरो व्यवस्थापन",
        "Electricity & Lighting": "विज आनी दिवे",
        "Water Supply & Sewerage": "उदक पुरवण आनी गटार वेवस्था",
        "Public Safety & Traffic": "लोक सुरक्षा आनी येरादारी",
        "Health & Environment": "भलायकी आनी पर्यावरण",
        "General Administration": "सामान्य प्रशासन"
    },
    "citizen": {
        "dashboard": {
            "tag": "नागरिक कृती केंद्र",
            "welcome": "परत येवकार, {{name}}",
            "subtitle": "तुमच्या वाठारांतल्या समस्यांची नोंद करात, पालिकेच्या कामाचेर नदर दवरात आनी सुटकेची खात्री करात.",
            "reportButton": "समस्या नोंदयात",
            "viewReportsButton": "म्हज्यो कागाळी पळयात",
            "stats": {
                "total": "एकूण कागाळी",
                "totalDesc": "नोंद केल्ल्यो सगळ्यो समस्या",
                "pending": "तपासणी प्रतिक्षेंत",
                "pendingDesc": "पालिकेच्या निर्णयाची वाट पळयता",
                "inProgress": "काम चालू आसा",
                "inProgressDesc": "सुवातेर काम चालू आसा",
                "resolved": "सुटका जाली",
                "resolvedDesc": "पूर्ण आनी तपासणी जाल्ली"
            },
            "verificationNotice": {
                "single": "1 सुटिल्ले समस्येचेर तुमची प्रत्यक्ष तपासणी गरजेची आसा",
                "multiple": "{{count}} सुटिल्ल्या समस्यांचेर तुमची प्रत्यक्ष तपासणी गरजेची आसा",
                "description": "पालिकेचे काम सोंपलां. समस्या खरोखर सुटल्या काय ना हाची खात्री करात.",
                "action": "आताच तपासणी करात"
            },
            "recentActivity": "हालींची घडामोड",
            "latestReports": "ताजी नागरिक प्रकरण",
            "viewAll": "सगळें पळयात ({{count}})",
            "impact": {
                "tag": "समाजीक प्रभाव",
                "title": "प्रशासनाक जापसालदार करप",
                "description": "तुमची दर एक कागाळ प्रशासनाक जापसालदार करता आनी शाराक नितळ दवरूंक आदार करता.",
                "totalImpact": "तुमचें एकूण योगदान",
                "reports": "कागाळी",
                "registry": "शार नोंदवहीत समाविष्ट",
                "resolutionRate": "निवारण दर",
                "resolvedCount": "{{total}} तलीं {{resolved}} सुटलीं"
            },
            "empty": {
                "title": "अजून कोणतीच कागाळ नोंद जावंक ना",
                "description": "तुमी अजून कोणतीच समस्या नोंद करूंक ना. परिसराच्या समस्येचो फोटो काडून पयली कागाळ करात.",
                "primaryAction": "आताच समस्या नोंदयात",
                "secondaryAction": "समस्या सूची पळयात"
            },
            "loadError": "कागाळी लोड करपाक जमलें ना."
        },
        "report": {
            "tag": "नागरिक नोंदणी",
            "title": "नागरी समस्या नोंदयात",
            "description": "पायाभूत सुविधा, स्वच्छता वा सुरक्षेक लागून कागाळ नोंदयात. तुमची कागाळ अधिकाऱ्यांमेरेन पावतली.",
            "steps": {
                "step1": "1",
                "step1Title": "समस्येचें वर्णन करात",
                "step1Subtitle": "तुमी कसली समस्या नोंद करतात?",
                "step2": "2",
                "step2Title": "सुवात दाखयात",
                "step2Subtitle": "समस्या खंय आसा?",
                "step3": "3",
                "step3Title": "फोटो जोडात",
                "step3Subtitle": "समस्येचो फोटो पुरावे खातीर दियात",
                "step4": "4",
                "step4Title": "सादर करपाक तयार?",
                "step4Subtitle": "सादर करचे आदीं वयर दिल्लो तपशील तपासात."
            },
            "fields": {
                "titleLabel": "समस्येचें नांव",
                "titlePlaceholder": "उदा. बंद पडिल्लो दिवो, कचऱ्याचो ढीग, रस्त्यार व्हड खड्डो",
                "categoryLabel": "प्रवर्ग",
                "categorySelect": "प्रवर्ग निवडात",
                "descriptionLabel": "तपशीलवार वर्णन",
                "descriptionPlaceholder": "समस्येचो सविस्तर तपशील दियात: नक्की सुवात, धोको, कितल्या दिसांसावन आसा...",
                "locationLabel": "सुवात आनी लँडमार्क",
                "locationPlaceholder": "उदा. मेट्रो पिलर 142 लागीं, जुबिली हिल्स रोड क्र. 36",
                "gpsTitle": "GPS स्थान",
                "gpsDescription": "स्थान जोडल्यार कामगारांक सुवात बेगीन सोदपाक मदत जाता.",
                "gpsButton": "म्हजें सध्याचें स्थान वापरा",
                "gpsDetecting": "GPS सोद चालू आसा...",
                "gpsCaptured": "स्थान मेळ्ळें: {{lat}}, {{lng}}",
                "gpsAccuracy": " (±{{accuracy}}मी)",
                "photoUploadTitle": "फोटो काडपाक वा निवडपाक क्लिक करात",
                "photoUploadDesc": "JPG, PNG, HEIC, WebP समर्थित. अपलोड करचे आदीं फोटो ल्हान जातात.",
                "selectFile": "फायल निवडात",
                "processingFile": "प्रक्रिया चालू आसा...",
                "removePhoto": "काडून उडयात"
            },
            "voice": {
                "speakButton": "उलवून वर्णन दियात",
                "listening": "आयकता... आतां उलय्यात",
                "stop": "थांबयात",
                "transcribing": "AI मजकूर तयार करता...",
                "detectedLanguage": "{{language}} भाषेंत वळखलें",
                "replaceOrAppend": "मजकूर तयार जालो. सकयल तपासात वा बदल करात.",
                "micPermissionDenied": "मायक्रोफोन परवानगी मेळ्ळी ना. ब्राऊझर सेटिंग्सांत परवानगी दियात.",
                "micNotSupported": "ह्या ब्राऊझरांत व्हॉइस रेकॉर्डिंग उपलब्ध ना.",
                "transcriptionFailed": "व्हॉइस रेकॉर्डिंग वळखूंक आयलें ना. परत प्रयत्न करात वा टाईप करात.",
                "reviewTitle": "व्हॉइस मजकूर तपासणी",
                "originalTextLabel": "मूळ उलैल मजकूर",
                "englishTranslationLabel": "इंग्लीश अणकार",
                "useTranscription": "हो मजकूर वापरा",
                "recordAgain": "परत रेकॉर्ड करात",
                "discard": "रद्द करात"
            },
            "stages": {
                "idle": "सादर करपाक तयार",
                "saving": "समस्या नोंद जाता...",
                "uploading": "फोटो अपलोड जाता...",
                "finalizing": "कागाळ पुराय जाता..."
            },
            "submitButton": "नागरी कागाळ दाखल करात",
            "successModal": {
                "tag": "कागाळ यशस्वीपणान नोंद जाली",
                "title": "तुमची नागरी कागाळ नोंद जाली!",
                "refText": "CivicFix-आन तुमची कागाळ नोंद केली आनी संदर्भ क्रमांक दिला",
                "summary": "कागाळ सारांश",
                "titleField": "शीर्षक",
                "categoryField": "प्रवर्ग",
                "statusField": "स्थिती",
                "submittedAtField": "दाखल केल्लो वेळ",
                "viewIssue": "म्हजी कागाळ पळयात",
                "backToDashboard": "डॅशबोर्डार परत वचात"
            },
            "partialErrorModal": {
                "tag": "सूचनेसयत कागाळ जतन जाली",
                "title": "तुमची कागाळ तयार जाली",
                "description": "समस्या डेटाबेस मदीं नोंद जाली, पूण फोटो अपलोड पुराय जावंक ना.",
                "viewIssues": "म्हज्यो कागाळी पळयात",
                "backToDashboard": "डॅशबोर्डार परत वचात"
            },
            "validation": {
                "title": "उपकार करून समस्येचें शीर्षक दियात.",
                "description": "उपकार करून समस्येचें वर्णन दियात.",
                "category": "उपकार करून प्रवर्ग निवडात.",
                "location": "उपकार करून सुवात वा लँडमार्क दियात.",
                "image": "उपकार करून JPG, PNG, HEIC वा WebP फोटो निवडात."
            }
        },
        "issues": {
            "tag": "कागाळ नोंदवही",
            "title": "म्हज्यो नागरी कागाळी",
            "description": "शारांत दाखल केल्ली दर एक समस्या सोधात, फिल्टर करात आनी प्रगतीचेर नदर दवरात.",
            "reportButton": "समस्या नोंदयात",
            "searchPlaceholder": "शीर्षक, सुवात, प्रवर्ग, वर्णना प्रमाण सोधात...",
            "sortNewest": "नवें पयलीं",
            "sortOldest": "पोरनें पयलीं",
            "filtersSort": "फिल्टर आनी क्रमवारी",
            "resetFilters": "फिल्टर परत स्थापीत करात",
            "showingCount": "{{total}} तलीं {{filtered}} कागाळी दाखयतात",
            "sortedBy": "क्रमवारी: {{order}}",
            "empty": {
                "noReports": "कसलीच कागाळ मेळ्ळी ना",
                "noReportsDesc": "तुमी अजून कोणतीच कागाळ दाखल करूंक ना. पयली CivicFix कागाळ करात.",
                "noMatches": "जुळपी कागाळ ना",
                "noMatchesDesc": "सध्याच्या सोदाक जुळपी कागाळ ना. फिल्टर बदलून पळयात."
            },
            "filterLabels": {
                "all": "सगळे",
                "pending": "प्रलंबित",
                "verified": "तपासणी जाल्ली",
                "inProgress": "काम चालू",
                "resolved": "निवारण जालें",
                "reopened": "परत उक्ती केली",
                "rejected": "नकारली"
            }
        },
        "issueDetails": {
            "backToReports": "म्हज्या कागाळींचेर परत",
            "reportedOn": "{{date}} दिसा नोंद जाल्ली",
            "reference": "संदर्भ #{{id}}",
            "descriptionSection": "समस्येचें वर्णन",
            "locationSection": "सुवातेची म्हायती",
            "landmark": "लँडमार्क / पत्तो",
            "coordinates": "GPS निर्देशांक",
            "openMap": "नकाशांत पळयात",
            "photoSection": "फोटो पुरावे",
            "initialPhoto": "नागरिकान दिल्लो फोटो",
            "resolutionPhoto": "निवारणाचा पुरावा फोटो",
            "timelineSection": "प्रगती आनी इतिहास",
            "deptAssignment": "नेमून दिल्लो विभाग",
            "originalLanguage": "मूळ भाषा",
            "inputMethod": "नोंदणी माध्यम",
            "voiceInput": "व्हॉइस रेकॉर्डिंग",
            "textInput": "बरयल्लो मजकूर",
            "viewEnglish": "इंग्लीश अणकार पळयात",
            "viewOriginal": "मूळ पळयात ({{lang}})",
            "canonicalNotice": "ही कागाळ {{lang}} भाषेंत नोंद केल्ली आनी पालिकेच्या कामकाजा खातीर इंग्लीशांत अणकारल्या.",
            "verificationCard": {
                "title": "प्रत्यक्ष तपासणी गरजेची",
                "description": "पालिकेच्या कामगारांनी ही समस्या सुटल्या म्हणून दाखयलां. सुवातेर काम खरोखर जालें काय?",
                "yesButton": "हय, समस्या सुटल्या",
                "noButton": "ना, अजूनय समस्या आसा (परत उगतात)",
                "verifiedYes": "तुमी समस्या सुटल्याची खात्री केली. देव बरें करूं!",
                "verifiedNo": "तुमी सांगलें की समस्या सुटूंक ना. ती परत तपासणे खातीर धाडल्या."
            },
            "reopenModal": {
                "title": "कागाळ परत उगतात",
                "description": "कामगारांक सुदारणा करपाक कारण सांगात.",
                "feedbackLabel": "परत उगडपाचें कारण",
                "feedbackPlaceholder": "उदा. दिवो दुरुस्त केल्लो पूण दुसऱ्याच दिसा परत बंद पडलो...",
                "submitReopen": "कागाळ परत उगतात",
                "cancel": "रद्द करात"
            }
        },
        "notifications": {
            "tag": "सूचना केंद्र",
            "title": "नागरिक अलर्ट आनी अपडेट्स",
            "description": "नोंद केल्ल्या समस्यांची स्थिती आनी पालिकेच्या पावलांची म्हायती मेळयात.",
            "emptyTitle": "सध्या कोणतीच सूचना ना",
            "emptyDescription": "तुमी सगळे अपडेट्स पळयल्यात! नव्यो सूचना हांगा दिसतलयो.",
            "today": "आयज",
            "earlier": "फाटीं",
            "total": "एकूण",
            "unread": "वाचुंक नाशिल्ल्यो",
            "read": "वाचिल्ली",
            "unreadBadge": "वाचुंक नाशिल्ली",
            "loadError": "सूचना लोड करपाक जमलें ना."
        },
        "userMenu": {
            "accountMenu": "वापरपी खाते मेनु",
            "signOut": "साइन आउट"
        }
    }
}

KS_DICT = {
    "common": {
        "loading": "لوڈ گژھان چھُ...",
        "error": "خرابی",
        "tryAgain": "دوبارٕ کٔرِو کوشش",
        "back": "واپس",
        "cancel": "منسوخ",
        "submit": "جمع کٔرِو",
        "save": "محفوظ کٔرِو",
        "search": "تلاش کٔرِو",
        "reset": "ریسیٹ",
        "optional": "اختیاری",
        "required": "لازمی",
        "all": "سٲری",
        "viewDetails": "تفصیلات وِچھِو",
        "backToDashboard": "ڈیش بورڈَس پیٹھ واپس گژھِو",
        "workspace": "CivicFix ورک سپیس",
        "close": "بند کٔرِو",
        "activeRole": "فعال رول",
        "workflowPipeline": "ورک فلو پائپ لائن"
    },
    "nav": {
        "dashboard": "ڈیش بورڈ",
        "reportIssue": "مسئلہ درج کٔرِو",
        "myIssues": "میانی شکایات",
        "notifications": "اطلاعات",
        "signOut": "سائن آؤٹ",
        "activeRoleDesc": "{{role}} کاروائی خٲطرٕ CivicFix ورک سپیس۔"
    },
    "languages": LANGUAGES_BLOCK,
    "categories": {
        "Pothole": "سڑکہِ ہُنٛد کھوڈ",
        "Garbage": "کۆدُور / گندٕ",
        "Streetlight": "اسٹریٹ لائٹ",
        "Water Supply": "آبُک انتظام",
        "Drainage": "نالہٕ / ڈرینج",
        "Road Damage": "سڑک ہنز خرابی",
        "Traffic/Safety": "ٹریفک / حفاظت",
        "Other": "باقی"
    },
    "statuses": {
        "SUBMITTED": "درج گٔیہِ",
        "AI_ANALYZED": "AI تجزِیہٕ",
        "AWAITING_ADMIN_CLASSIFICATION": "درجہ بندی ہُنٛد انتظار",
        "CLASSIFIED_SIMPLE": "آسان مسئلہ",
        "CLASSIFIED_COMPLEX": "پیچیدہ چیلنج",
        "UNDER_REVIEW": "زیر نظر",
        "TRIAGED": "جانچ مکمل",
        "ASSIGNED": "تفویض شدہ",
        "IN_PROGRESS": "کام جاری",
        "PARTIALLY_COMPLETED": "کٔنٛہہ حدس تام مکمل",
        "RESOLVED": "حل گۆو",
        "CITIZEN_VERIFIED": "شہری تصدیق شدہ",
        "VERIFIED": "تصدیق شدہ",
        "REOPENED": "دوبارٕ کھولنہٕ آو",
        "REJECTED": "مسترد",
        "ESCALATED_TO_INNOVATION": "تحقیق خٲطرٕ سوزنہٕ آو"
    },
    "priorities": {
        "LOW": "کم",
        "MEDIUM": "درمیانہٕ",
        "HIGH": "زیادٕ",
        "URGENT": "ضروری",
        "all": "سٲری ترجیحات"
    },
    "departments": {
        "Roads & Infrastructure": "سڑک تہٕ ڈهانچہٕ",
        "Sanitation & Waste Management": "صفائی تہٕ کوڑا انتظام",
        "Electricity & Lighting": "بجلی تہٕ بتہِ",
        "Water Supply & Sewerage": "آب تہٕ گند آب نالی",
        "Public Safety & Traffic": "عوامی حفاظت تہٕ ٹریفک",
        "Health & Environment": "صحت تہٕ ماحول",
        "General Administration": "عمومی انتظامیہ"
    },
    "citizen": {
        "dashboard": {
            "tag": "شہری خدمت مرکز",
            "welcome": "خوش آمدید، {{name}}",
            "subtitle": "پنہِ علاقٕک شہری مسٲئل درج کٔرِو، بلدیاتی ترقی وِچھِو تہٕ حل ہنٛز تصدیق کٔرِو۔",
            "reportButton": "مسئلہ درج کٔرِو",
            "viewReportsButton": "میانی رپورٹس وِچھِو",
            "stats": {
                "total": "کُل شکایات",
                "totalDesc": "سٲری درج شدہ شہری مسٲئل",
                "pending": "زیر انتظار",
                "pendingDesc": "بلدیاتی جائزے ہُنٛد انتظار",
                "inProgress": "کام جاری",
                "inProgressDesc": "میدانی سطحس پیٹھ کام چالو",
                "resolved": "حل گۆو",
                "resolvedDesc": "مکمل تہٕ تصدیق شدہ"
            },
            "verificationNotice": {
                "single": "1 حل شدہ مسلس پیٹھ چھُ تُہنٛز تصدیق ضروری",
                "multiple": "{{count}} حل شدہ مسلن پیٹھ چھُ تُہنٛز تصدیق ضروری",
                "description": "بلدیاتی کام گٔیہِ مکمل۔ برائے مہربانی کٔرِو تصدیق زِ کیا مسئلہ گۆو پۆز حل۔",
                "action": "وۄنۍ کٔرِو تصدیق"
            },
            "recentActivity": "حالیہ سرگرمی",
            "latestReports": "تازٕ شہری شکایات",
            "viewAll": "سٲری وِچھِو ({{count}})",
            "impact": {
                "tag": "کمیونٹی اثرات",
                "title": "بلدیہ جوابدہ بناوُن",
                "description": "تُہنٛز پرٛیتھ شکایت چھِ انتظامیہ جوابدہ بناوان تہٕ شَہَر صَفٲئی مَنٛز مدد کران۔",
                "totalImpact": "تُہنٛد کُل تعاون",
                "reports": "شکایات",
                "registry": "شہر رجسٹرس مَنٛز درج",
                "resolutionRate": "حل ہنٛز شرح",
                "resolvedCount": "{{total}} مَنٛز {{resolved}} حل"
            },
            "empty": {
                "title": "کانٛہہ شکایت چَھنہٕ درج کٔرمٕژ",
                "description": "تۄہی چِھو نہٕ اَز تام کانٛہہ مسئلہ درج کۆرمُت۔ فوٹو تُلِو تہٕ گۄڈنِچ رپورٹ درج کٔرِو۔",
                "primaryAction": "وۄنۍ کٔرِو مسئلہ درج",
                "secondaryAction": "شکایاتن ہنٛز لسٹ وِچھِو"
            },
            "loadError": "تُہنٛز شکایات لوڈ گژھنس مَنٛز خرابی۔"
        },
        "report": {
            "tag": "شہری شکایت اندراج",
            "title": "شہری مسئلہ درج کٔرِو",
            "description": "ڈھانچہٕ، صفائی یا حفاظت متعلق شکایت کٔرِو۔ تُہنٛز رپورٹ واژِ سیدھے افسرن تام۔",
            "steps": {
                "step1": "1",
                "step1Title": "مسئلہ بیان کٔرِو",
                "step1Subtitle": "تۄہی کیتھ مسئلس پیٹھ چِھو رپوٹ کران؟",
                "step2": "2",
                "step2Title": "جای واضح کٔرِو",
                "step2Subtitle": "مسئلہ کٔتھ جای چُھ؟",
                "step3": "3",
                "step3Title": "تصویر لگٲوِو",
                "step3Subtitle": "مسئلک تصویری ثبوت دِیِو",
                "step4": "4",
                "step4Title": "جمع کرنہٕ خٲطرٕ تیار؟",
                "step4Subtitle": "جمع کرنہٕ برٛونٛہہ تفصیلات جانچ کٔرِو।"
            },
            "fields": {
                "titleLabel": "مسئلک عنوان",
                "titlePlaceholder": "مثال: پھُٹمٕژ اسٹریٹ لائٹ، گندُک ڈھیر، سڑکہِ پیٹھ کھوڈ",
                "categoryLabel": "زمرہ",
                "categorySelect": "زمرہ چُنِو",
                "descriptionLabel": "تفصیل",
                "descriptionPlaceholder": "مسئلس پیٹھ مکمل معلومات دِیِو: صحیح جای، خطرہ، کیژاہ کالہٕ پیٹھہٕ چھُ...",
                "locationLabel": "جای تہٕ نشانی",
                "locationPlaceholder": "مثال: میٹرو پلر 142 نزدیٖک، جوبلی ہلز روڈ نمبر 36",
                "gpsTitle": "GPS لوکیشن",
                "gpsDescription": "لوکیشن جوڑنہٕ سٟتۍ وازن عملہٕ جلدی جائے پؠٹھ۔",
                "gpsButton": "میون موجودٕ لوکیشن اِستعمال کٔرِو",
                "gpsDetecting": "GPS تلاش چھُ گژھان...",
                "gpsCaptured": "لوکیشن مِلیاو: {{lat}}, {{lng}}",
                "gpsAccuracy": " (±{{accuracy}}میٹر)",
                "photoUploadTitle": "تصویر تُلون یا چُننہٕ خٲطرٕ کلک کٔرِو",
                "photoUploadDesc": "JPG, PNG, HEIC, WebP سپورٹڈ۔ اپلوڈ برٛونٛہہ چھِ فوٹو خودکار طور کمپریس گژھان۔",
                "selectFile": "فائل چُنِو",
                "processingFile": "پروسیس چھُ گژھان...",
                "removePhoto": "ہٹٲوِو"
            },
            "voice": {
                "speakButton": "بٲتھ ؤنِتھ تفصیل دِیِو",
                "listening": "بوزان چھُ... وۄنۍ ؤنِو",
                "stop": "رُکٲوِو",
                "transcribing": "AI متن مَنٛز تبدیل چھُ کران...",
                "detectedLanguage": "{{language}} زبانہِ مَنٛز شناخت",
                "replaceOrAppend": "متن گۆو تیار۔ بۄن وِچھِو یا سدھار کٔرِو۔",
                "micPermissionDenied": "مائیکروفونک اجازت مِلیو نہٕ۔ براؤزر سیٹنگس مَنٛز اجازت دِیِو۔",
                "micNotSupported": "ام براؤزرس مَنٛز وائس سپورٹ چُھنہٕ۔",
                "transcriptionFailed": "وائس کنورژن گوو ناکام۔ دوبارٕ کوشش کٔرِو یا ٹائپ کٔرِو۔",
                "reviewTitle": "وائس متن جانچ",
                "originalTextLabel": "اصل وننہٕ آمت متن",
                "englishTranslationLabel": "انگریزی ترجمہ",
                "useTranscription": "یہِ متن اِستعمال کٔرِو",
                "recordAgain": "دوبارٕ ریکارڈ کٔرِو",
                "discard": "رد کٔرِو"
            },
            "stages": {
                "idle": "جمع کرنہٕ خٲطرٕ تیار",
                "saving": "شکایت چھِ درج گژھان...",
                "uploading": "تصویر چھِ اپلوڈ گژھان...",
                "finalizing": "رپورٹ چھِ آخری شکل دِوان..."
            },
            "submitButton": "شہری رپورٹ جمع کٔرِو",
            "successModal": {
                "tag": "رپورٹ کامیابی سان درج گٔیہِ",
                "title": "تُہنٛز شہری رپورٹ گٔیہِ درج!",
                "refText": "CivicFix-ن کٔر تُہنٛز رپورٹ درج تہٕ دِیت حوالہ نمبر",
                "summary": "رپورٹ خلاصہ",
                "titleField": "عنوان",
                "categoryField": "زمرہ",
                "statusField": "حالت",
                "submittedAtField": "درج کرنُک وقت",
                "viewIssue": "میون مسئلہ وِچھِو",
                "backToDashboard": "ڈیش بورڈَس پیٹھ واپس گژھِو"
            },
            "partialErrorModal": {
                "tag": "اطلاع سٟتۍ محفوظ",
                "title": "تُہنٛز رپورٹ بنییہِ",
                "description": "مسئلہ گۆو درج مگر تصویر چَھنہٕ اپلوڈ گٔمٕژ۔",
                "viewIssues": "میانی شکایات وِچھِو",
                "backToDashboard": "ڈیش بورڈَس پیٹھ واپس گژھِو"
            },
            "validation": {
                "title": "برائے مہربانی مسئلک عنوان دِیِو۔",
                "description": "برائے مہربانی مسئلچ تفصیل دِیِو۔",
                "category": "برائے مہربانی زمرہ چُنِو۔",
                "location": "برائے مہربانی جای یا نشانی لِکھِو۔",
                "image": "برائے مہربانی JPG, PNG, HEIC یا WebP تصویر چُنِو।"
            }
        },
        "issues": {
            "tag": "شکایاتک رجسٹر",
            "title": "میانی شہری شکایات",
            "description": "پنہِ شہرس مَنٛز درج پرٛیتھ شکایت تلاش کٔرِو، فلٹر کٔرِو تہٕ نظر تھاوِو۔",
            "reportButton": "مسئلہ درج کٔرِو",
            "searchPlaceholder": "عنوان، جای، زمرہ، تفصیل سٟتۍ تلاش کٔرِو...",
            "sortNewest": "تازٕ گۄڈٕ",
            "sortOldest": "پُرانہٕ گۄڈٕ",
            "filtersSort": "فلٹرز تہٕ ترتیب",
            "resetFilters": "فلٹرز ریسیٹ کٔرِو",
            "showingCount": "{{total}} مَنٛز {{filtered}} شکایات چھِ ہاوان",
            "sortedBy": "ترتیب: {{order}}",
            "empty": {
                "noReports": "کانٛہہ شکایت مِلییہِ نہٕ",
                "noReportsDesc": "تۄہی چِھو نہٕ اَز تام کانٛہہ شکایت درج کٔرمٕژ۔ گۄڈنِچ CivicFix رپورٹ بناوِو۔",
                "noMatches": "کانٛہہ مماثل شکایت چَھنہٕ",
                "noMatchesDesc": "موجودٕ تلاشس مطٲبق کانٛہہ شکایت چَھنہٕ۔ فلٹرز بدلوِو।"
            },
            "filterLabels": {
                "all": "سٲری",
                "pending": "زیر التواء",
                "verified": "تصدیق شدہ",
                "inProgress": "جاری",
                "resolved": "حل گۆو",
                "reopened": "دوبارٕ کھولنہٕ آو",
                "rejected": "مسترد"
            }
        },
        "issueDetails": {
            "backToReports": "میانی شکایاتن پیٹھ واپس",
            "reportedOn": "{{date}} پیٹھ درج شدہ",
            "reference": "حوالہ #{{id}}",
            "descriptionSection": "مسئلچ تفصیل",
            "locationSection": "جایچ معلومات",
            "landmark": "نشانی / پتہ",
            "coordinates": "GPS کوآرڈینیٹس",
            "openMap": "نقشس مَنٛز وِچھِو",
            "photoSection": "تصویری ثبوت",
            "initialPhoto": "شہری ہُنٛد دِتمُت فوٹو",
            "resolutionPhoto": "حلک ثبوت فوٹو",
            "timelineSection": "ترقی تہٕ تاریخ",
            "deptAssignment": "تفویض شدہ محکمہ",
            "originalLanguage": "اصل زبان",
            "inputMethod": "اندراجک ذریعہ",
            "voiceInput": "وائس ریکارڈنگ",
            "textInput": "لکھت متن",
            "viewEnglish": "انگریزی ترجمہ وِچھِو",
            "viewOriginal": "اصل متن وِچھِو ({{lang}})",
            "canonicalNotice": "یہِ رپورٹ ٲس {{lang}} مَنٛز درج تہٕ بلدیاتی کارروائی خٲطرٕ انگریزی مَنٛز ترجمہ کٔرمٕژ۔",
            "verificationCard": {
                "title": "زمینی تصدیق ضروری",
                "description": "بلدیاتی ٹیٖمن چھُ یہِ مسئلہ حل قرار دیۆتمُت۔ کیا مسئلہ پۆز حل گۆو؟",
                "yesButton": "آ، مسئلہ گۆو حل",
                "noButton": "نہٕ، وۄنہِ تہِ چھُ مسئلہ (دوبارٕ کھولِو)",
                "verifiedYes": "تۄہی کٔرو مسئلہ حل گژھنچ تصدیق۔ شکریہ!",
                "verifiedNo": "تۄہی وۆن زِ مسئلہ گۆو نہٕ حل۔ یہِ سوزو دوبارٕ جانچ خٲطرٕ۔"
            },
            "reopenModal": {
                "title": "شکایت دوبارٕ کھولِو",
                "description": "وجہ دِیِو تاکہ عملہٕ درستی ہنٛد قدم تُلی۔",
                "feedbackLabel": "دوبارٕ کھولنک سبب",
                "feedbackPlaceholder": "مثال: بَتھ کٔرِک ٹھیک مگر دۄیمہِ دۄہ پؠیہِ دوبارٕ بند...",
                "submitReopen": "شکایت دوبارٕ کھولِو",
                "cancel": "منسوخ"
            }
        },
        "notifications": {
            "tag": "اطلاعاتک مرکز",
            "title": "شہری الرٹس تہٕ اپ ڈیٹس",
            "description": "پنہِ شکایاتن ہنز حالت تہٕ بلدیاتی کاروائی پیٹھ نظر تھٲوِو۔",
            "emptyTitle": "کانٛہہ اطلاع چَھنہٕ",
            "emptyDescription": "تۄہی چِھو سٲری اپ ڈیٹس وُچھمٕتی! نٔو اطلاع وازن یَتھ جای۔",
            "today": "از",
            "earlier": "برٛونٛہہ",
            "total": "کُل",
            "unread": "بۄزمُت نہٕ",
            "read": "بۄزمُت",
            "unreadBadge": "بۄزمُت نہٕ",
            "loadError": "اطلاعات لوڈ گژھنس مَنٛز خرابی۔"
        },
        "userMenu": {
            "accountMenu": "صارف اکاؤنٹ مینو",
            "signOut": "سائن آؤٹ"
        }
    }
}

SD_DICT = {
    "common": {
        "loading": "لوڊ ٿي رهيو آهي...",
        "error": "خرابي",
        "tryAgain": "ٻيهر ڪوشش ڪريو",
        "back": "واپس",
        "cancel": "رد ڪريو",
        "submit": "جمع ڪريو",
        "save": "محفوظ ڪريو",
        "search": "ڳوليو",
        "reset": "ٻيهر ترتيب ڏيو",
        "optional": "اختياري",
        "required": "لازمي",
        "all": "سڀ",
        "viewDetails": "تفصيل ڏسو",
        "backToDashboard": "ڊيش بورڊ ڏانهن واپس",
        "workspace": "CivicFix ورڪ اسپيس",
        "close": "بند ڪريو",
        "activeRole": "فعال ڪردار",
        "workflowPipeline": "ورڪ فلو پائپ لائين"
    },
    "nav": {
        "dashboard": "ڊيش بورڊ",
        "reportIssue": "مسئلو داخل ڪريو",
        "myIssues": "منهنجون شڪايتون",
        "notifications": "اطلاع",
        "signOut": "سائن آئوٽ",
        "activeRoleDesc": "{{role}} ڪارروائي لاءِ CivicFix ورڪ اسپيس."
    },
    "languages": LANGUAGES_BLOCK,
    "categories": {
        "Pothole": "روڊ جو کڏو",
        "Garbage": "ڪچرو",
        "Streetlight": "اسٽريٽ لائيٽ",
        "Water Supply": "پاڻي جي فراهمي",
        "Drainage": "نڪاسي آب",
        "Road Damage": "روڊ جي خرابي",
        "Traffic/Safety": "ٽريفڪ / حفاظت",
        "Other": "ٻيا"
    },
    "statuses": {
        "SUBMITTED": "داخل ٿيل",
        "AI_ANALYZED": "AI تجزيو ٿيل",
        "AWAITING_ADMIN_CLASSIFICATION": "درجه بندي جو انتظار",
        "CLASSIFIED_SIMPLE": "سادو مسئلو",
        "CLASSIFIED_COMPLEX": "پيچيده چئلينج",
        "UNDER_REVIEW": "نظرثاني هيٺ",
        "TRIAGED": "جاچ مڪمل",
        "ASSIGNED": "تفويض ٿيل",
        "IN_PROGRESS": "ڪم جاري آهي",
        "PARTIALLY_COMPLETED": "جزوي مڪمل",
        "RESOLVED": "حل ٿيل",
        "CITIZEN_VERIFIED": "شهري تصديق ٿيل",
        "VERIFIED": "تصديق ٿيل",
        "REOPENED": "ٻيهر کوليل",
        "REJECTED": "رد ٿيل",
        "ESCALATED_TO_INNOVATION": "تحقيق لاءِ موڪليل"
    },
    "priorities": {
        "LOW": "گھٽ",
        "MEDIUM": "درميانو",
        "HIGH": "وڌيڪ",
        "URGENT": "فوري",
        "all": "سموريون ترجيحون"
    },
    "departments": {
        "Roads & Infrastructure": "روڊ ۽ بنيادي ڍانچو",
        "Sanitation & Waste Management": "صفائي ۽ ڪچرو انتظام",
        "Electricity & Lighting": "بجلي ۽ بتيون",
        "Water Supply & Sewerage": "پاڻي ۽ گندي پاڻي جي نڪاسي",
        "Public Safety & Traffic": "عوامي تحفظ ۽ ٽريفڪ",
        "Health & Environment": "صحت ۽ ماحوليات",
        "General Administration": "عام انتظاميه"
    },
    "citizen": {
        "dashboard": {
            "tag": "شهري خدمت مرڪز",
            "welcome": "ڀلي ڪري آيا، {{name}}",
            "subtitle": "پنهنجي علائقي جا شهري مسئلا داخل ڪريو، ميونسپل اڳڀرائي ڏسو ۽ حل جي تصديق ڪريو.",
            "reportButton": "مسئلو داخل ڪريو",
            "viewReportsButton": "منهنجون رپورٽون ڏسو",
            "stats": {
                "total": "ڪل رپورٽون",
                "totalDesc": "داخل ٿيل سمورا شهري مسئلا",
                "pending": "انتظار هيٺ",
                "pendingDesc": "ميونسپل نظرثاني جو انتظار",
                "inProgress": "ڪم جاري آهي",
                "inProgressDesc": "ميداني سطح تي ڪم چالو",
                "resolved": "حل ٿيل",
                "resolvedDesc": "مڪمل ۽ تصديق ٿيل"
            },
            "verificationNotice": {
                "single": "1 حل ٿيل مسئلي تي توهان جي زميني تصديق گهربل آهي",
                "multiple": "{{count}} حل ٿيل مسئلن تي توهان جي زميني تصديق گهربل آهي",
                "description": "ميونسپل ڪم مڪمل ٿي چڪو آهي. مهرباني ڪري تصديق ڪريو ته ڇا مسئلو حل ٿيو آهي.",
                "action": "هاڻي تصديق ڪريو"
            },
            "recentActivity": "تازي سرگرمي",
            "latestReports": "تازيون شهري رپورٽون",
            "viewAll": "سڀ ڏسو ({{count}})",
            "impact": {
                "tag": "ڪميونٽي اثر",
                "title": "انتظاميا کي جوابده بڻائڻ",
                "description": "توهان جي هر رپورٽ انتظاميا کي جوابده بڻائي ٿي ۽ شهر کي صاف ۽ محفوظ رکڻ ۾ مدد ڪري ٿي.",
                "totalImpact": "توهان جو ڪل حصو",
                "reports": "رپورٽون",
                "registry": "شهري رجسٽر ۾ شامل",
                "resolutionRate": "حل جي شرح",
                "resolvedCount": "{{total}} مان {{resolved}} حل"
            },
            "empty": {
                "title": "اڃا تائين ڪا به رپورٽ داخل ناهي",
                "description": "توهان اڃا تائين ڪو مسئلو داخل ناهي ڪيو. پنهنجي علائقي جي مسئلي جي تصوير ڪڍو ۽ پهرين رپورٽ داخل ڪريو.",
                "primaryAction": "هاڻي مسئلو داخل ڪريو",
                "secondaryAction": "مسئلن جي فهرست ڏسو"
            },
            "loadError": "رپورٽون لوڊ ڪرڻ ۾ ناڪامي."
        },
        "report": {
            "tag": "شهري شڪايت داخلا",
            "title": "شهري مسئلو داخل ڪريو",
            "description": "بنيادي ڍانچي، صفائي يا حفاظت بابت شڪايت ڪريو. توهان جي رپورٽ سڌو لاڳاپيل عملدارن تائين پهچندي.",
            "steps": {
                "step1": "1",
                "step1Title": "مسئلي جي وضاحت ڪريو",
                "step1Subtitle": "توهان ڪهڙي مسئلي بابت ٻڌائي رهيا آهيو?",
                "step2": "2",
                "step2Title": "جڳهه مقرر ڪريو",
                "step2Subtitle": "مسئلو ڪٿي واقع آهي?",
                "step3": "3",
                "step3Title": "تصوير ڳنڍيو",
                "step3Subtitle": "مسئلي جو تصويري ثبوت ڏيو",
                "step4": "4",
                "step4Title": "جمع ڪرڻ لاءِ تيار?",
                "step4Subtitle": "جمع ڪرڻ کان اڳ مٿي ڏنل تفصيل چڪاسيو."
            },
            "fields": {
                "titleLabel": "مسئلي جو عنوان",
                "titlePlaceholder": "مثال: ٽٽل اسٽريٽ لائيٽ، ڪچري جو ڍير، روڊ تي کڏو",
                "categoryLabel": "زمرو",
                "categorySelect": "زمرو چونڊيو",
                "descriptionLabel": "تفصيل",
                "descriptionPlaceholder": "مسئلي جي مڪمل تفصيل ڏيو: صحيح جڳهه، خطرو، ڪيتري وقت کان آهي...",
                "locationLabel": "جڳهه ۽ نشاني",
                "locationPlaceholder": "مثال: ميٽرو پلر 142 ويجهو، جوبلي هلس روڊ نمبر 36",
                "gpsTitle": "GPS لوڪيشن",
                "gpsDescription": "لوڪيشن ڳنڍڻ سان عملي کي صحيح جڳهه جلد ڳولڻ ۾ مدد ملندي.",
                "gpsButton": "منهنجي موجوده لوڪيشن استعمال ڪريو",
                "gpsDetecting": "GPS ڳوليو پيو وڃي...",
                "gpsCaptured": "لوڪيشن حاصل ٿي: {{lat}}, {{lng}}",
                "gpsAccuracy": " (±{{accuracy}}ميٽر)",
                "photoUploadTitle": "تصوير ڪڍڻ يا چونڊڻ لاءِ ڪلڪ ڪريو",
                "photoUploadDesc": "JPG, PNG, HEIC, WebP سپورٽ ٿيل. اپلوڊ کان اڳ تصويرون خودبخود ڪمپريس ٿينديون.",
                "selectFile": "فائل چونڊيو",
                "processingFile": "پروسيسنگ جاري آهي...",
                "removePhoto": "ختم ڪريو"
            },
            "voice": {
                "speakButton": "ڳالهائي تفصيل ڏيو",
                "listening": "ٻڌي رهيو آهي... هاڻي ڳالهايو",
                "stop": "روڪيو",
                "transcribing": "AI ذريعي متن ۾ تبديل ٿي رهيو آهي...",
                "detectedLanguage": "{{language}} ۾ سڃاڻپ ٿي",
                "replaceOrAppend": "متن تيار آهي. هيٺ ڏسو يا درست ڪريو.",
                "micPermissionDenied": "مائڪروفيون جي اجازت رد ٿي. برائوزر سيٽنگس ۾ اجازت ڏيو.",
                "micNotSupported": "هن برائوزر ۾ آواز رڪارڊنگ سهولت ناهي.",
                "transcriptionFailed": "آواز جي تبديلي ناڪام ٿي. ٻيهر ڪوشش ڪريو يا ٽائيپ ڪريو.",
                "reviewTitle": "آواز متن جو جائزو",
                "originalTextLabel": "اصل ڳالهايل متن",
                "englishTranslationLabel": "انگريزي ترجمو",
                "useTranscription": "هي متن استعمال ڪريو",
                "recordAgain": "ٻيهر رڪارڊ ڪريو",
                "discard": "رد ڪريو"
            },
            "stages": {
                "idle": "جمع ڪرڻ لاءِ تيار",
                "saving": "شڪايت داخل ٿي رهي آهي...",
                "uploading": "تصوير اپلوڊ ٿي رهي آهي...",
                "finalizing": "رپورٽ مڪمل ڪئي پئي وڃي..."
            },
            "submitButton": "شهري رپورٽ جمع ڪريو",
            "successModal": {
                "tag": "رپورٽ ڪاميابي سان داخل ٿي",
                "title": "توهان جي شهري رپورٽ داخل ٿي چڪي آهي!",
                "refText": "CivicFix توهان جي رپورٽ داخل ڪري ريفرنس نمبر ڏنو آهي",
                "summary": "رپورٽ جو خلاصو",
                "titleField": "عنوان",
                "categoryField": "زمرو",
                "statusField": "حالت",
                "submittedAtField": "داخلا جو وقت",
                "viewIssue": "منهنجو مسئلو ڏسو",
                "backToDashboard": "ڊيش بورڊ ڏانهن واپس"
            },
            "partialErrorModal": {
                "tag": "اطلاع سان رپورٽ محفوظ",
                "title": "توهان جي رپورٽ ٺهي وئي",
                "description": "مسئلو ڊيٽابيس ۾ داخل ٿيو آهي پر تصوير اپلوڊ مڪمل نه ٿي سگهي.",
                "viewIssues": "منهنجون شڪايتون ڏسو",
                "backToDashboard": "ڊيش بورڊ ڏانهن واپس"
            },
            "validation": {
                "title": "مهرباني ڪري مسئلي جو عنوان ڏيو.",
                "description": "مهرباني ڪري مسئلي جي تفصيل ڏيو.",
                "category": "مهرباني ڪري زمرو چونڊيو.",
                "location": "مهرباني ڪري جڳهه يا نشاني لکو.",
                "image": "مهرباني ڪري هڪ JPG, PNG, HEIC يا WebP تصوير چونڊيو."
            }
        },
        "issues": {
            "tag": "شڪايتن جو رجسٽر",
            "title": "منهنجون شهري شڪايتون",
            "description": "پنهنجي شهر ۾ داخل ڪيل هر شڪايت ڳوليو، فلٽر ڪريو ۽ ان تي نظر رکو.",
            "reportButton": "مسئلو داخل ڪريو",
            "searchPlaceholder": "عنوان، جڳهه، زمرو، تفصيل سان ڳوليو...",
            "sortNewest": "نئون اڳ ۾",
            "sortOldest": "پراڻو اڳ ۾",
            "filtersSort": "فلٽر ۽ ترتيب",
            "resetFilters": "فلٽر ٻيهر مقرر ڪريو",
            "showingCount": "{{total}} مان {{filtered}} شڪايتون ڏيکاريل آهن",
            "sortedBy": "ترتيب: {{order}}",
            "empty": {
                "noReports": "ڪا به شڪايت نه ملي",
                "noReportsDesc": "توهان اڃا تائين ڪا به شڪايت داخل ناهي ڪئي. پهرين CivicFix رپورٽ ٺاهي شروع ڪريو.",
                "noMatches": "ڪا به ملندڙ شڪايت ناهي",
                "noMatchesDesc": "موجوده ڳولا مطابق ڪا شڪايت ناهي ملي. فلٽر تبديل ڪري ڏسو."
            },
            "filterLabels": {
                "all": "سڀ",
                "pending": "انتظار هيٺ",
                "verified": "تصديق ٿيل",
                "inProgress": "جاري",
                "resolved": "حل ٿيل",
                "reopened": "ٻيهر کوليل",
                "rejected": "رد ٿيل"
            }
        },
        "issueDetails": {
            "backToReports": "منهنجي شڪايتن ڏانهن واپس",
            "reportedOn": "{{date}} تي داخل ڪيل",
            "reference": "حوالو #{{id}}",
            "descriptionSection": "مسئلي جي تفصيل",
            "locationSection": "جڳهه جي معلومات",
            "landmark": "نشاني / پتو",
            "coordinates": "GPS ڪوآرڊينيٽس",
            "openMap": "نقشي ۾ ڏسو",
            "photoSection": "تصويري ثبوت",
            "initialPhoto": "شهري طرفان ڏنل تصوير",
            "resolutionPhoto": "حل جو ثبوت تصوير",
            "timelineSection": "ترقي ۽ تاريخ",
            "deptAssignment": "تفويض ٿيل شعبو",
            "originalLanguage": "اصل ٻولي",
            "inputMethod": "داخل ڪرڻ جو طريقو",
            "voiceInput": "آواز رڪارڊنگ",
            "textInput": "لکيل متن",
            "viewEnglish": "انگريزي ترجمو ڏسو",
            "viewOriginal": "اصل ڏسو ({{lang}})",
            "canonicalNotice": "هي رپورٽ {{lang}} ۾ داخل ٿي هئي ۽ ميونسپل ڪارروائي لاءِ انگريزي ۾ ترجمو ڪئي وئي آهي.",
            "verificationCard": {
                "title": "زميني تصديق گهربل آهي",
                "description": "ميونسپل عملي هن مسئلي کي حل ٿيل قرار ڏنو آهي. ڇا مسئلو واقعي حل ٿي ويو آهي?",
                "yesButton": "ها، مسئلو حل ٿي ويو آهي",
                "noButton": "نه، اڃا به مسئلو آهي (ٻيهر کوليو)",
                "verifiedYes": "توهان مسئلو حل ٿيڻ جي تصديق ڪئي. مهرباني!",
                "verifiedNo": "توهان ٻڌايو ته مسئلو حل ناهي ٿيو. اهو ٻيهر جاچ لاءِ موڪليو ويو آهي."
            },
            "reopenModal": {
                "title": "شڪايت ٻيهر کوليو",
                "description": "سبب بيان ڪريو ته جيئن عملو درستگي جا قدم کڻي سگهي.",
                "feedbackLabel": "ٻيهر کولڻ جو سبب",
                "feedbackPlaceholder": "مثال: لائيٽ ٺيڪ ڪئي وئي هئي پر ٻئي ڏينهن وري بند ٿي وئي...",
                "submitReopen": "شڪايت ٻيهر کوليو",
                "cancel": "رد ڪريو"
            }
        },
        "notifications": {
            "tag": "اطلاع مرڪز",
            "title": "شهري الرٽ ۽ اپڊيٽس",
            "description": "پنهنجي شڪايتن جي حالت ۽ ميونسپل قدمن بابت ڄاڻ حاصل ڪريو.",
            "emptyTitle": "ڪو به اطلاع ناهي",
            "emptyDescription": "توهان سڀ اپڊيٽس ڏسي چڪا آهيو! نوان اطلاع هتي ظاهر ٿيندا.",
            "today": "اڄ",
            "earlier": "اڳ ۾",
            "total": "ڪل",
            "unread": "نه پڙهيل",
            "read": "پڙهيل",
            "unreadBadge": "نه پڙهيل",
            "loadError": "اطلاع لوڊ ڪرڻ ۾ ناڪامي."
        },
        "userMenu": {
            "accountMenu": "صارف کاتو مينيو",
            "signOut": "سائن آئوٽ"
        }
    }
}

MAI_DICT = {
    "common": {
        "loading": "लोड भ रहल अछि...",
        "error": "त्रुटि",
        "tryAgain": "पुनः प्रयास करू",
        "back": "पाछाँ",
        "cancel": "रद्द करू",
        "submit": "जमा करू",
        "save": "सहेज करू",
        "search": "खोजू",
        "reset": "रीसेट करू",
        "optional": "ऐच्छिक",
        "required": "आवश्यक",
        "all": "सब",
        "viewDetails": "विवरण देखू",
        "backToDashboard": "डैशबोर्ड पर वापस जाऊ",
        "workspace": "CivicFix कार्यक्षेत्र",
        "close": "बन्द करू",
        "activeRole": "सक्रिय भूमिका",
        "workflowPipeline": "कार्यप्रवाह पाइपलाइन"
    },
    "nav": {
        "dashboard": "डैशबोर्ड",
        "reportIssue": "समस्या दर्ज करू",
        "myIssues": "हमर शिकायत सभ",
        "notifications": "सूचना सभ",
        "signOut": "साइन आउट",
        "activeRoleDesc": "{{role}} काजक लेल CivicFix कार्यक्षेत्र।"
    },
    "languages": LANGUAGES_BLOCK,
    "categories": {
        "Pothole": "सड़कक गड्ढा",
        "Garbage": "कूड़ा-कचरा",
        "Streetlight": "स्ट्रीटलाइट",
        "Water Supply": "जल आपूर्ति",
        "Drainage": "जल निकासी / नाला",
        "Road Damage": "सड़क क्षति",
        "Traffic/Safety": "यातायात / सुरक्षा",
        "Other": "आन"
    },
    "statuses": {
        "SUBMITTED": "दर्ज भेल",
        "AI_ANALYZED": "AI द्वारा विश्लेषित",
        "AWAITING_ADMIN_CLASSIFICATION": "वर्गीकरण प्रतीक्षा में",
        "CLASSIFIED_SIMPLE": "सरल वर्गीकृत",
        "CLASSIFIED_COMPLEX": "जटिल चुनौती",
        "UNDER_REVIEW": "समीक्षाधीन",
        "TRIAGED": "वर्गीकृत भेल",
        "ASSIGNED": "आवंटित",
        "IN_PROGRESS": "काज जारी अछि",
        "PARTIALLY_COMPLETED": "आंशिक पूर्ण",
        "RESOLVED": "समाधान भेल",
        "CITIZEN_VERIFIED": "नागरिक सत्यापित",
        "VERIFIED": "सत्यापित",
        "REOPENED": "पुनः खोलल गेल",
        "REJECTED": "अस्वीकृत",
        "ESCALATED_TO_INNOVATION": "अनुसन्धान में प्रेषित"
    },
    "priorities": {
        "LOW": "निम्न",
        "MEDIUM": "मध्यम",
        "HIGH": "उच्च",
        "URGENT": "अति आवश्यक",
        "all": "सब प्राथमिकता सभ"
    },
    "departments": {
        "Roads & Infrastructure": "सड़क आ आधारभूत संरचना",
        "Sanitation & Waste Management": "स्वच्छता आ कचरा प्रबंधन",
        "Electricity & Lighting": "विद्युत आ प्रकाश व्यवस्था",
        "Water Supply & Sewerage": "जल आपूर्ति आ नाला व्यवस्था",
        "Public Safety & Traffic": "सार्वजनिक सुरक्षा आ यातायात",
        "Health & Environment": "स्वास्थ्य आ पर्यावरण",
        "General Administration": "सामान्य प्रशासन"
    },
    "citizen": {
        "dashboard": {
            "tag": "नागरिक सेवा केंद्र",
            "welcome": "पुनः स्वागत अछि, {{name}}",
            "subtitle": "अपन क्षेत्रक नागरिक समस्या सभक रिपोर्ट करू, नगर निगम प्रगति ट्रैक करू आ जमीनी समाधानक सत्यापन करू।",
            "reportButton": "समस्या दर्ज करू",
            "viewReportsButton": "हमर रिपोर्ट सभ देखू",
            "stats": {
                "total": "कुल रिपोर्ट",
                "totalDesc": "दर्ज कएल गेल सब नागरिक शिकायत",
                "pending": "प्रतीक्षारत",
                "pendingDesc": "नगर निगम समीक्षाक प्रतीक्षा में",
                "inProgress": "काज जारी अछि",
                "inProgressDesc": "जमीनी स्तर पर काज चलि रहल अछि",
                "resolved": "समाधान भेल",
                "resolvedDesc": "पूर्ण आ सत्यापित"
            },
            "verificationNotice": {
                "single": "1 सुलझल समस्या पर अहाँक स्थलगत सत्यापन आवश्यक अछि",
                "multiple": "{{count}} सुलझल समस्या सभ पर अहाँक स्थलगत सत्यापन आवश्यक अछि",
                "description": "नगर पालिकाक काज पूर्ण भऽ चुकल अछि। कृपया पुष्टि करू जे समस्या दूर भेल कि नहि।",
                "action": "अखने सत्यापन करू"
            },
            "recentActivity": "हालक गतिविधि",
            "latestReports": "ताजा नागरिक रिपोर्ट सभ",
            "viewAll": "सब देखू ({{count}})",
            "impact": {
                "tag": "सामुदायिक प्रभाव",
                "title": "नगर निगम व्यवस्थाक उत्तरदायित्व",
                "description": "अहाँक हर रिपोर्ट प्रशासनक जवाबदेही तय करैत अछि आ शहरकेँ स्वच्छ व सुरक्षित राखय में मदद करैत अछि।",
                "totalImpact": "अहाँक कुल योगदान",
                "reports": "शिकायत सभ",
                "registry": "नगर पंजिका में दर्ज",
                "resolutionRate": "समाधान दर",
                "resolvedCount": "{{total}} में सँ {{resolved}} टा समाधान"
            },
            "empty": {
                "title": "एखन धरि कोनो शिकायत दर्ज नहि",
                "description": "अहाँ एखन धरि कोनो समस्या दर्ज नहि कएलहुँ अछि। समस्याक फोटो लऽ कऽ पहिल रिपोर्ट दर्ज करू।",
                "primaryAction": "अखने समस्या दर्ज करू",
                "secondaryAction": "समस्या सूची देखू"
            },
            "loadError": "अहाँक रिपोर्ट लोड करय में असमर्थ।"
        },
        "report": {
            "tag": "नागरिक शिकायत पंजीयन",
            "title": "नागरिक समस्या दर्ज करू",
            "description": "आधारभूत संरचना, स्वच्छता अथवा सुरक्षा सम्बन्धी शिकायत दर्ज करू। अहाँक रिपोर्ट सीधे अधिकारी सभ लग पहुँचत।",
            "steps": {
                "step1": "1",
                "step1Title": "समस्याक विवरण दिअ",
                "step1Subtitle": "अहाँ कोन समस्याक रिपोर्ट कऽ रहल छी?",
                "step2": "2",
                "step2Title": "स्थान निर्धारित करू",
                "step2Subtitle": "समस्या कतय स्थित अछि?",
                "step3": "3",
                "step3Title": "फोटो संलग्न करू",
                "step3Subtitle": "समस्याक फोटो प्रमाण दिअ",
                "step4": "4",
                "step4Title": "जमा करय लेल तैयार?",
                "step4Subtitle": "जमा करय सँ पहिने ऊपर देल विवरण जाँची लिअ।"
            },
            "fields": {
                "titleLabel": "समस्याक शीर्षक",
                "titlePlaceholder": "जहिना: टूटल स्ट्रीटलाइट, कचराक ढेर, सड़क पर गहीर गड्ढा",
                "categoryLabel": "श्रेणी",
                "categorySelect": "एकटा श्रेणी चुनू",
                "descriptionLabel": "विस्तृत विवरण",
                "descriptionPlaceholder": "समस्याक पूरा विवरण दिअ: सटीक स्थान, खतरा, कतेक दिन सँ अछि...",
                "locationLabel": "स्थान आ पहचान चिह्न",
                "locationPlaceholder": "जहिना: मेट्रो पिलर 142 लग, जुबली हिल्स रोड नं 36",
                "gpsTitle": "GPS भू-स्थान",
                "gpsDescription": "स्थान निर्देशांक जोड़ला सँ कर्मी सभकेँ ठाउँ खोजय में सुविधा होइत अछि।",
                "gpsButton": "हमर वर्तमान स्थानक उपयोग करू",
                "gpsDetecting": "GPS खोजल जा रहल अछि...",
                "gpsCaptured": "स्थान प्राप्त भेल: {{lat}}, {{lng}}",
                "gpsAccuracy": " (±{{accuracy}}मी)",
                "photoUploadTitle": "फोटो खींचय वा चुनय लेल क्लिक करू",
                "photoUploadDesc": "JPG, PNG, HEIC, WebP समर्थित। अपलोड सँ पहिने फोटो अपने आप कंप्रेस भऽ जाइत अछि।",
                "selectFile": "फाइल चुनू",
                "processingFile": "प्रक्रिया जारी अछि...",
                "removePhoto": "हटाउ"
            },
            "voice": {
                "speakButton": "बाजि कऽ विवरण दिअ",
                "listening": "सुनि रहल अछि... आब बाजु",
                "stop": "रोकू",
                "transcribing": "AI द्वारा पाठ में रूपान्तरण जारी...",
                "detectedLanguage": "{{language}} भाषा में पहचान भेल",
                "replaceOrAppend": "पाठ तैयार भेल। नीचाँ जाँचू वा सम्पादन करू।",
                "micPermissionDenied": "माइक्रोफोन अनुमति अस्वीकृत। ब्राउजर सेटिंग्स में अनुमति दिअ।",
                "micNotSupported": "एहि ब्राउजर में आवाज रिकॉर्डिंग सुविधा नहि अछि।",
                "transcriptionFailed": "आवाज रूपान्तरण विफल भेल। पुनः प्रयास करू वा टाइप करू।",
                "reviewTitle": "आवाज पाठ समीक्षा",
                "originalTextLabel": "मूल बाजल गेल पाठ",
                "englishTranslationLabel": "अंग्रेजी अनुवाद",
                "useTranscription": "ई पाठ प्रयोग करू",
                "recordAgain": "पुनः रिकॉर्ड करू",
                "discard": "खारिज करू"
            },
            "stages": {
                "idle": "जमा करय लेल तैयार",
                "saving": "समस्या दर्ज भऽ रहल अछि...",
                "uploading": "फोटो अपलोड भऽ रहल अछि...",
                "finalizing": "रिपोर्ट अन्तिम कएल जा रहल अछि..."
            },
            "submitButton": "नागरिक रिपोर्ट जमा करू",
            "successModal": {
                "tag": "रिपोर्ट सफलतापूर्वक दर्ज भेल",
                "title": "अहाँक नागरिक रिपोर्ट दर्ज भऽ गेल!",
                "refText": "CivicFix अहाँक रिपोर्ट दर्ज कऽ सन्दर्भ संख्या देलक अछि",
                "summary": "रिपोर्ट सारांश",
                "titleField": "शीर्षक",
                "categoryField": "श्रेणी",
                "statusField": "स्थिति",
                "submittedAtField": "दर्ज समय",
                "viewIssue": "हमर समस्या देखू",
                "backToDashboard": "डैशबोर्ड पर वापस जाऊ"
            },
            "partialErrorModal": {
                "tag": "सूचना संग रिपोर्ट सुरक्षित",
                "title": "अहाँक रिपोर्ट बनल",
                "description": "समस्या डेटाबेस में दर्ज भेल, मुदा फोटो अपलोड पूर्ण नहि भऽ सकल।",
                "viewIssues": "हमर शिकायत सभ देखू",
                "backToDashboard": "डैशबोर्ड पर वापस जाऊ"
            },
            "validation": {
                "title": "कृपया समस्याक शीर्षक दिअ।",
                "description": "कृपया समस्याक विवरण दिअ।",
                "category": "कृपया एकटा श्रेणी चुनू।",
                "location": "कृपया स्थान वा पहचान चिह्न लिखू।",
                "image": "कृपया एकटा JPG, PNG, HEIC वा WebP फोटो चुनू।"
            }
        },
        "issues": {
            "tag": "शिकायत पंजी",
            "title": "हमर नागरिक शिकायत सभ",
            "description": "अपन शहर में दर्ज कएल प्रत्येक शिकायत खोजू, फिल्टर करू आ नजरि राखू।",
            "reportButton": "समस्या दर्ज करू",
            "searchPlaceholder": "शीर्षक, स्थान, श्रेणी, विवरण सँ खोजू...",
            "sortNewest": "नवीनतम पहिने",
            "sortOldest": "पुरातन पहिने",
            "filtersSort": "फिल्टर आ क्रमबद्धता",
            "resetFilters": "फिल्टर रीसेट करू",
            "showingCount": "{{total}} में सँ {{filtered}} टा शिकायत देखाओल जा रहल अछि",
            "sortedBy": "क्रम: {{order}}",
            "empty": {
                "noReports": "कोनो शिकायत नहि भेटल",
                "noReportsDesc": "अहाँ एखन धरि कोनो शिकायत दर्ज नहि कएलहुँ अछि। पहिल CivicFix रिपोर्ट बनाऊ।",
                "noMatches": "कोनो मेल खाइत शिकायत नहि",
                "noMatchesDesc": "वर्तमान खोजक अनुसार कोनो शिकायत नहि भेटल। फिल्टर बदलि कऽ देखू।"
            },
            "filterLabels": {
                "all": "सब",
                "pending": "लम्बित",
                "verified": "सत्यापित",
                "inProgress": "काज जारी",
                "resolved": "समाधान भेल",
                "reopened": "पुनः खोलल गेल",
                "rejected": "अस्वीकृत"
            }
        },
        "issueDetails": {
            "backToReports": "हमर शिकायत पर वापस जाऊ",
            "reportedOn": "{{date}} कऽ दर्ज भेल छल",
            "reference": "सन्दर्भ #{{id}}",
            "descriptionSection": "समस्या विवरण",
            "locationSection": "स्थान जानकारी",
            "landmark": "पहचान चिह्न / पता",
            "coordinates": "GPS निर्देशांक",
            "openMap": "मानचित्र में देखू",
            "photoSection": "फोटो प्रमाण",
            "initialPhoto": "नागरिक द्वारा देल गेल फोटो",
            "resolutionPhoto": "समाधान प्रमाण फोटो",
            "timelineSection": "प्रगति आ इतिहास",
            "deptAssignment": "आवंटित विभाग",
            "originalLanguage": "मूल भाषा",
            "inputMethod": "माध्यम",
            "voiceInput": "ध्वनि रिकॉर्डिंग",
            "textInput": "लिखित पाठ",
            "viewEnglish": "अंग्रेजी अनुवाद देखू",
            "viewOriginal": "मूल देखू ({{lang}})",
            "canonicalNotice": "ई रिपोर्ट {{lang}} में दर्ज भेल छल आ प्रशासनिक काज लेल अंग्रेजी में अनुवाद कएल गेल अछि।",
            "verificationCard": {
                "title": "स्थलीय सत्यापन आवश्यक",
                "description": "नगरपालिका दल एहि समस्याकेँ हल चिह्नित कएने अछि। की समस्या सचमुच ठीक भऽ गेल?",
                "yesButton": "हँ, समस्या हल भऽ गेल",
                "noButton": "नहि, एखनो समस्या अछि (पुनः खोलू)",
                "verifiedYes": "अहाँ समाधानक पुष्टि कएलहुँ। धन्यवाद!",
                "verifiedNo": "अहाँ जनओलहुँ जे समस्या दूर नहि भेल। एकरा पुनः जाँच लेल पठाओल गेल।"
            },
            "reopenModal": {
                "title": "शिकायत पुनः खोलू",
                "description": "कारण स्पष्ट करू ताकि कर्मचारी सुधारात्मक कदम लऽ सकथि।",
                "feedbackLabel": "पुनः खोलबाक कारण",
                "feedbackPlaceholder": "जहिना: लाइट ठीक भेल छल मुदा अगिला दिन फेर बन्द भऽ गेल...",
                "submitReopen": "शिकायत पुनः खोलू",
                "cancel": "रद्द करू"
            }
        },
        "notifications": {
            "tag": "सूचना केंद्र",
            "title": "नागरिक अलर्ट आ अपडेट सभ",
            "description": "अपन समस्याक स्थिति आ नगर पालिकाक काज सम्बन्धी जानकारी पाबू।",
            "emptyTitle": "एखन कोनो सूचना नहि अछि",
            "emptyDescription": "अहाँ सबटा अपडेट देखि चुकल छी! नव सूचना एतय देखाइ पड़त।",
            "today": "आजि",
            "earlier": "पहिने",
            "total": "कुल",
            "unread": "अपठित",
            "read": "पढ़ल गेल",
            "unreadBadge": "अपठित",
            "loadError": "सूचना लोड करय में असमर्थ।"
        },
        "userMenu": {
            "accountMenu": "उपयोगकर्ता खाता मेनु",
            "signOut": "साइन आउट"
        }
    }
}

MNI_DICT = {
    "common": {
        "loading": "লোড তৌরি...",
        "error": "অশোইবা",
        "tryAgain": "অমুক হন্না হোৎনৌ",
        "back": "হন্দোকপা",
        "cancel": "তোকপা",
        "submit": "থারকপা",
        "save": "থম্বা",
        "search": "থীবা",
        "reset": "অমুক হন্না শেম্বা",
        "optional": "অপাম্বা",
        "required": "মথৌ তাবা",
        "all": "পুম্নমক",
        "viewDetails": "অকুপ্পা য়েংবা",
        "backToDashboard": "দ্যাশবোর্ডতা হলকপা",
        "workspace": "CivicFix ৱার্কস্পেস",
        "close": "থিংজিনবা",
        "activeRole": "এক্টিভ রোল",
        "workflowPipeline": "ৱার্কফ্লো পাইপলাইন"
    },
    "nav": {
        "dashboard": "দ্যাশবোর্ড",
        "reportIssue": "ৱাকৎ থারকপা",
        "myIssues": "ঐগী ৱাকৎশিং",
        "notifications": "পাউতাকশিং",
        "signOut": "সাইন আউত",
        "activeRoleDesc": "{{role}} থবকশিংগী CivicFix ৱার্কস্পেস।"
    },
    "languages": LANGUAGES_BLOCK,
    "categories": {
        "Pothole": "লম্বীগী কোম্বাক",
        "Garbage": "লৈতেং / শেংদবা পোৎ",
        "Streetlight": "লম্বীগী মৈ",
        "Water Supply": "ঈশিং ফংহনবা",
        "Drainage": "ঈরোইবা ড্রেন",
        "Road Damage": "লম্বী মাংবা",
        "Traffic/Safety": "ট্রেফিক / সেফটি",
        "Other": "অতোপ্পা"
    },
    "statuses": {
        "SUBMITTED": "থারক্লে",
        "AI_ANALYZED": "AI নৈনরে",
        "AWAITING_ADMIN_CLASSIFICATION": "খায়দোকপগী ঙাইরি",
        "CLASSIFIED_SIMPLE": "চমবা ৱাকৎ",
        "CLASSIFIED_COMPLEX": "লুবা শিংনবা",
        "UNDER_REVIEW": "য়েংশিনবগী মনুংদা",
        "TRIAGED": "নৈনবা লোইরে",
        "ASSIGNED": "থবক শিন্নরে",
        "IN_PROGRESS": "থবক চত্থরি",
        "PARTIALLY_COMPLETED": "খরা লোইরে",
        "RESOLVED": "কোকহনখ্রে",
        "CITIZEN_VERIFIED": "নাগরিকনা য়েংশিনখ্রে",
        "VERIFIED": "চুমি হায়রে",
        "REOPENED": "অমুক হন্না হাংদোকলে",
        "REJECTED": "য়াদ্রে",
        "ESCALATED_TO_INNOVATION": "রিসার্সতা থাখ্রে"
    },
    "priorities": {
        "LOW": "হন্না",
        "MEDIUM": "মরক্তা",
        "HIGH": "ৱাংনা",
        "URGENT": "মথৌ য়াম্না তাবা",
        "all": "প্রায়োরিতি পুম্নমক"
    },
    "departments": {
        "Roads & Infrastructure": "লম্বী অমসুং ইনফ্রাস্ত্রকচর",
        "Sanitation & Waste Management": "শেংদোকপা অমসুং গার্বেজ ম্যানেজমেন্ট",
        "Electricity & Lighting": "মৈ অমসুং লম্বীগী মৈ",
        "Water Supply & Sewerage": "ঈশিং অমসুং সিৱরেজ",
        "Public Safety & Traffic": "মীয়ামগী সেফটি অমসুং ট্রেফিক",
        "Health & Environment": "হকশেল অমসুং এনভাইরনমেন্ট",
        "General Administration": "জেনেরল এডমিনিস্ট্রেশন"
    },
    "citizen": {
        "dashboard": {
            "tag": "নাগরিক সেবা কেন্দ্র",
            "welcome": "তরাম্না ওকচরি, {{name}}",
            "subtitle": "নহাক্কী লমদমগী খুদোংচাদবশিং ৱাকৎলু, মিউনিসিপাল থবকশিং য়েংশিল্লু অমসুং মফমদুদা লোইখ্রব্রা য়েংশিল্লু।",
            "reportButton": "ৱাকৎ থারকপা",
            "viewReportsButton": "ঐগী রিপোর্টশিং য়েংবা",
            "stats": {
                "total": "অপুনবা রিপোর্ট",
                "totalDesc": "থারকখিবা ৱাকৎ পুম্নমক",
                "pending": "ঙাইদুনা লৈরিবা",
                "pendingDesc": "মিউনিসিপালনা য়েংশিনবগী ঙাইরি",
                "inProgress": "থবক চত্থরিবা",
                "inProgressDesc": "মফমদা থবক পায়খৎলি",
                "resolved": "লোইশিনখ্রবা",
                "resolvedDesc": "লোইরে অমসুং য়েংশিনখ্রে"
            },
            "verificationNotice": {
                "single": "লোইশিনখ্রবা সমস্যা ১ নহাক্না মফমদা য়েংশিনবা মথৌ তাই",
                "multiple": "লোইশিনখ্রবা সমস্যা {{count}} নহাক্না মফমদা য়েংশিনবা মথৌ তাই",
                "description": "মিউনিসিপালগী থবক লোইরে। সমস্যাদু শেংনা লোইখ্রব্রা য়েংবীয়ু।",
                "action": "হৌজিক য়েংশিল্লু"
            },
            "recentActivity": "হন্দক্কী থবকশিং",
            "latestReports": "অনৌবা নাগরিক রিপোর্টশিং",
            "viewAll": "পুম্নমক য়েংবা ({{count}})",
            "impact": {
                "tag": "কম্যুনিটি ইম্পেক্ট",
                "title": "মিউনিসিপালবু থৌদাং হাপ্পা",
                "description": "নহাক্কী ৱাকৎ খুদিংমক্না প্রসাশনবু থৌদাং ফংহল্লি অমসুং সহর অসি শেংনা অমসুং সেফ ওইনা থম্বদা মতেং পাংই।",
                "totalImpact": "নহাক্কী অপুনবা মতেং",
                "reports": "ৱাকৎশিং",
                "registry": "সহরগী রেজিষ্ট্রিদা চনখ্রে",
                "resolutionRate": "লোইশিনবগী চাং",
                "resolvedCount": "{{total}} দগী {{resolved}} লোইশিনখ্রে"
            },
            "empty": {
                "title": "হৌজিকফাওবা ৱাকৎ অমত্তা থারকত্রি",
                "description": "নহাক্না হৌজিকফাওবা ৱাকৎ অমত্তা থারকত্রি। অদোমগী মফমগী সমস্যা ফটো লৌদুনা অহানবা রিপোর্ট থারকউ।",
                "primaryAction": "হৌজিক ৱাকৎ থারকউ",
                "secondaryAction": "ৱাকৎকী লিষ্ট য়েংবা"
            },
            "loadError": "নহাক্কী রিপোর্টশিং লোড তৌবা ঙমদ্রে।"
        },
        "report": {
            "tag": "নাগরিক ৱাকৎ থারকপা",
            "title": "নাগরিক সমস্যা ৱাকৎলু",
            "description": "ইনফ্রাস্ত্রকচর, শেংদোকপা নত্রগা সেফটিগী মরমদা ৱাকৎলু। নহাক্কী রিপোর্ট হকথেংননা ওফিসারশিংদা য়ৌরগনি।",
            "steps": {
                "step1": "১",
                "step1Title": "সমস্যাগী মরমদা শন্দোক্না হায়বীয়ু",
                "step1Subtitle": "নহাক্না করি সমস্যাগী মরমদা ৱাকৎলি?",
                "step2": "২",
                "step2Title": "মফম তাকপীয়ু",
                "step2Subtitle": "সমস্যা অসি কদাইদা লৈরি?",
                "step3": "৩",
                "step3Title": "ফটো হাপচিল্লু",
                "step3Subtitle": "সমস্যাগী ফটো প্রমান পীবিয়ু",
                "step4": "৪",
                "step4Title": "থারকপদা শেম-শারে?",
                "step4Subtitle": "থারক্ত্রিঙৈগী মমাংদা য়েংশিনবীয়ু।"
            },
            "fields": {
                "titleLabel": "সমস্যাগী মমিং",
                "titlePlaceholder": "খুদম: থুগায়রবা মৈরা, গার্বেজ ফাওবা, লম্বীগী কোম্বাক",
                "categoryLabel": "কাংলুপ",
                "categorySelect": "কাংলুপ অমা খল্লু",
                "descriptionLabel": "অকুপ্পা বিবরণ",
                "descriptionPlaceholder": "সমস্যাগী মরমদা অকুপ্পা মচা শন্দোক্না হায়বীয়ু: চপ চাবা মফম, অকিবা, কয়াদায় লৈরক্লে...",
                "locationLabel": "মফম অমসুং মশক খঙনবা",
                "locationPlaceholder": "খুদম: মেট্রো পিলার ১৪২ মনাক্তা, জুবিলী হিলস লম্বী নং ৩৬",
                "gpsTitle": "GPS মফম",
                "gpsDescription": "মফমগী কোওর্ডিনেট হাপচিনবনা থবকমীশিংনা মফমদু অথুবা মতমদা থীবা ঙমহনগনি।",
                "gpsButton": "ঐগী হৌজিক লৈরিবা মফম শিজিন্নৌ",
                "gpsDetecting": "GPS থীরি...",
                "gpsCaptured": "মফম ফংলে: {{lat}}, {{lng}}",
                "gpsAccuracy": " (±{{accuracy}}মি)",
                "photoUploadTitle": "ফটো লৌনবা নত্রগা খন্নবা ক্লিক তৌ",
                "photoUploadDesc": "JPG, PNG, HEIC, WebP য়াওই। অপলোড তৌদ্রিঙৈদা ফটোশিং মখোয়না কমপ্রেস তৌগনি।",
                "selectFile": "ফাইল খল্লু",
                "processingFile": "প্রোসেসিং তৌরি...",
                "removePhoto": "লৌথোকউ"
            },
            "voice": {
                "speakButton": "খোঞ্জেলনা ৱাকৎলু",
                "listening": "তারি... হৌজিক ঙাংবীয়ু",
                "stop": "লেপউ",
                "transcribing": "AI না অইবা টেক্সট ওন্থোক্লি...",
                "detectedLanguage": "{{language}} লোনদা খঙলে",
                "replaceOrAppend": "টেক্সট শেম-শারে। মখাদা য়েংশিল্লু নত্রগা শেমদোকউ।",
                "micPermissionDenied": "মাইক্রোফোনগী অয়াবা ফংদ্রে। ব্রাউজার সেটিংদা অয়াবা পীবিয়ু।",
                "micNotSupported": "ব্রাউজার অসিদা খোঞ্জেল রেকোর্দিং তৌবা য়াদ্রে।",
                "transcriptionFailed": "খোঞ্জেল টেক্সট ওন্থোকপা ঙমদ্রে। অমুক হন্না হোৎনৌ নত্রগা টাইপ তৌ।",
                "reviewTitle": "খোঞ্জেল টেক্সট য়েংশিনবা",
                "originalTextLabel": "ঙাংখিবা টেক্সট",
                "englishTranslationLabel": "ইংলিশ ওন্থোকপা",
                "useTranscription": "টেক্সট অসি শিজিন্নৌ",
                "recordAgain": "অমুক হন্না রেকর্ড তৌ",
                "discard": "তোকউ"
            },
            "stages": {
                "idle": "থারকপদা শেম-শারে",
                "saving": "সমস্যা রেজিষ্টার তৌরি...",
                "uploading": "ফটো অপলোড তৌরি...",
                "finalizing": "রিপোর্ট লোইশিল্লি..."
            },
            "submitButton": "নাগরিক রিপোর্ট থারকউ",
            "successModal": {
                "tag": "রিপোর্ট মাইপাক্না থারক্লে",
                "title": "নহাক্কী নাগরিক রিপোর্ট থারক্লে!",
                "refText": "CivicFix না নহাক্কী ৱাকৎ রেজিষ্টার তৌরে অমসুং রিফরেন্স নম্বর পীখ্রে",
                "summary": "রিপোর্টকী অকুপ্পা",
                "titleField": "মমিং",
                "categoryField": "কাংলুপ",
                "statusField": "ফীভম",
                "submittedAtField": "থারকখিবা মতম",
                "viewIssue": "ঐগী সমস্যা য়েংবা",
                "backToDashboard": "দ্যাশবোর্ডতা হলকপা"
            },
            "partialErrorModal": {
                "tag": "পাউতাক্কা লোয়ননা সেভ তৌরে",
                "title": "নহাক্কী রিপোর্ট শেম্লে",
                "description": "সমস্যা ডাটাবেসতা চনখ্রে, অদুবু ফটো অপলোড তৌবা লোইদ্রে।",
                "viewIssues": "ঐগী ৱাকৎশিং য়েংবা",
                "backToDashboard": "দ্যাশবোর্ডতা হলকপা"
            },
            "validation": {
                "title": "সমস্যাগী মমিং অমা পীবিয়ু।",
                "description": "সমস্যাগী বিবরণ অমা পীবিয়ু।",
                "category": "কাংলুপ অমা খল্লু।",
                "location": "মফম নত্রগা মশক খঙনবা মফম অমা ইরু।",
                "image": "JPG, PNG, HEIC নত্রগা WebP ফটো অমা খল্লু।"
            }
        },
        "issues": {
            "tag": "ৱাকৎকী রেজিষ্ট্রি",
            "title": "ঐগী নাগরিক ৱাকৎশিং",
            "description": "নহাক্কী সহরদা থারকখিবা ৱাকৎ পুম্নমক থীবা, ফিল্টার তৌবা অমসুং য়েংশিনবা।",
            "reportButton": "ৱাকৎ থারকপা",
            "searchPlaceholder": "মমিং, মফম, কাংলুপ, বিবরণগী মতুংইন্না থীবা...",
            "sortNewest": "অনৌবা অহানবা",
            "sortOldest": "অরিবা অহানবা",
            "filtersSort": "ফিল্টার অমসুং শেমজিনবা",
            "resetFilters": "ফিল্টার অমুক হন্না শেম্বা",
            "showingCount": "{{total}} গী মনুংদা {{filtered}} উৎলি",
            "sortedBy": "মতুংইন্না: {{order}}",
            "empty": {
                "noReports": "ৱাকৎ অমত্তা ফংদ্রে",
                "noReportsDesc": "নহাক্না হৌজিকফাওবা ৱাকৎ অমত্তা থারকত্রি। অহানবা CivicFix রিপোর্ট শেম্মু।",
                "noMatches": "চান্নবা ৱাকৎ ফংদ্রে",
                "noMatchesDesc": "হৌজিক থীরিবা অসিগা চান্নবা ৱাকৎ ফংদ্রে। ফিল্টার হোংদোক্তুনা য়েংউ।"
            },
            "filterLabels": {
                "all": "পুম্নমক",
                "pending": "ঙাইরিবা",
                "verified": "য়েংশিনখ্রবা",
                "inProgress": "চত্থরিবা",
                "resolved": "লোইশিনখ্রবা",
                "reopened": "অমুক হন্না হাংদোকপা",
                "rejected": "য়াদবা"
            }
        },
        "issueDetails": {
            "backToReports": "ঐগী ৱাকৎশিংদা হলকপা",
            "reportedOn": "{{date}} দা থারকখিবা",
            "reference": "রিফরেন্স #{{id}}",
            "descriptionSection": "সমস্যাগী অকুপ্পা",
            "locationSection": "মফমগী পাউ",
            "landmark": "মশক খঙনবা / লৈফম",
            "coordinates": "GPS কোওর্ডিনেটশিং",
            "openMap": "মেপতা হাংদোকউ",
            "photoSection": "ফটো প্রমানশিং",
            "initialPhoto": "নাগরিকনা থারকপা ফটো",
            "resolutionPhoto": "লোইশিনবগী প্রমান ফটো",
            "timelineSection": "প্রগতি অমসুং ইতিহাস",
            "deptAssignment": "শিন্নখিবা বিভাগ",
            "originalLanguage": "অহানবা লোন",
            "inputMethod": "থারকখিবা পাম্বৈ",
            "voiceInput": "খোঞ্জেল রেকোর্দিং",
            "textInput": "অইবা টেক্সট",
            "viewEnglish": "ইংলিশ ওন্থোকপা য়েংবা",
            "viewOriginal": "অহানবা রূপ য়েংবা ({{lang}})",
            "canonicalNotice": "রিপোর্ট অসি {{lang}} লোনদা থারকখিবনি অমসুং মিউনিসিপালগী থবক তৌনবা ইংলিশতা ওন্থোকখিবনি।",
            "verificationCard": {
                "title": "মফমদা য়েংশিনবা মথৌ তাই",
                "description": "মিউনিসিপাল টিমনা সমস্যা অসি লোইরে হায়না মার্ক তৌরে। মফমদা সমস্যা শেংনা লোইখ্রব্রা?",
                "yesButton": "হোই, সমস্যা লোইখ্রে",
                "noButton": "নত্তে, হৌজিকসু সমস্যা লৈরি (অমুক হন্না হাংদোকউ)",
                "verifiedYes": "নহাক্না সমস্যা লোইরে হায়না চেক্ তৌরে। থাগৎচরি!",
                "verifiedNo": "নহাক্না সমস্যা লোইদ্রি হায়না পাউ পীখ্রে। মসিবু অমুক হন্না য়েংশিন্নবা থাখ্রে।"
            },
            "reopenModal": {
                "title": "ৱাকৎ অমুক হন্না হাংদোকউ",
                "description": "থবকমীশিংনা শেমদোকপদা মতেং ওইনবা মরম তাকপীয়ু।",
                "feedbackLabel": "অমুক হন্না হাংদোকপগী মরম",
                "feedbackPlaceholder": "খুদম: মৈ শেমখি অদুবু মথংগী নুমিৎতা অমুক মুৎখ্রে...",
                "submitReopen": "ৱাকৎ অমুক হন্না হাংদোকউ",
                "cancel": "তোকউ"
            }
        },
        "notifications": {
            "tag": "পাউতাক কেন্দ্র",
            "title": "নাগরিক এলর্ট অমসুং অপদেৎশিং",
            "description": "নহাক্না থারকপা ৱাকৎশিংগী ফীভম অমসুং মিউনিসিপালগী খোংথাংশিং খঙবীয়ু।",
            "emptyTitle": "পাউতাক অমত্তা লৈত্ৰি",
            "emptyDescription": "নহাক্না অপদেৎ পুম্নমক য়েংখ্রে! অনৌবা পাউতাকশিং মফমসিদা উরগনি।",
            "today": "ঙসি",
            "earlier": "হান্নগী",
            "total": "অপুনবা",
            "unread": "পারিদ্রিবা",
            "read": "পাখ্রবা",
            "unreadBadge": "পারিদ্রিবা",
            "loadError": "পাউতাকশিং লোড তৌবা ঙমদ্রে।"
        },
        "userMenu": {
            "accountMenu": "ইউজার একাউন্ট মেনু",
            "signOut": "সাইন আউত"
        }
    }
}
