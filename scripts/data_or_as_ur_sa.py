# -*- coding: utf-8 -*-
from data_hi_mr import LANGUAGES_BLOCK

OR_DICT = {
    "common": {
        "loading": "ଲୋଡ୍ ହେଉଛି...",
        "error": "ତ୍ରୁଟି",
        "tryAgain": "ପୁନର୍ବାର ଚେଷ୍ଟା କରନ୍ତୁ",
        "back": "ପଛକୁ ଯାଆନ୍ତୁ",
        "cancel": "ବାତିଲ କରନ୍ତୁ",
        "submit": "ଦାଖଲ କରନ୍ତୁ",
        "save": "ସଂରକ୍ଷଣ କରନ୍ତୁ",
        "search": "ଖୋଜନ୍ତୁ",
        "reset": "ରିସେଟ୍ କରନ୍ତୁ",
        "optional": "ଇଚ୍ଛାଧୀନ",
        "required": "ଆବଶ୍ୟକ",
        "all": "ସମସ୍ତ",
        "viewDetails": "ବିବରଣୀ ଦେଖନ୍ତୁ",
        "backToDashboard": "ଡ୍ୟାସବୋର୍ଡକୁ ଫେରନ୍ତୁ",
        "workspace": "CivicFix କାର୍ଯ୍ୟକ୍ଷେତ୍ର",
        "close": "ବନ୍ଦ କରନ୍ତୁ",
        "activeRole": "ସକ୍ରିୟ ଭୂମିକା",
        "workflowPipeline": "କାର୍ଯ୍ୟପ୍ରବାହ ପାଇପଲାଇନ୍"
    },
    "nav": {
        "dashboard": "ଡ୍ୟାସବୋର୍ଡ",
        "reportIssue": "ସମସ୍ୟା ଦାଖଲ କରନ୍ତୁ",
        "myIssues": "ମୋର ଅଭିଯୋଗ",
        "notifications": "ବିଜ୍ଞପ୍ତି",
        "signOut": "ସାଇନ୍ ଆଉଟ୍",
        "activeRoleDesc": "{{role}} କାର୍ଯ୍ୟାବଳୀ ପାଇଁ CivicFix କାର୍ଯ୍ୟକ୍ଷେତ୍ର।"
    },
    "languages": LANGUAGES_BLOCK,
    "categories": {
        "Pothole": "ରାସ୍ତା ଖାଲ",
        "Garbage": "ଆବର୍ଜନା",
        "Streetlight": "ଷ୍ଟ୍ରିଟ୍ ଲାଇଟ୍",
        "Water Supply": "ଜଳ ଯୋଗାଣ",
        "Drainage": "ଜଳ ନିଷ୍କାସନ / ଡ୍ରେନେଜ୍",
        "Road Damage": "ରାସ୍ତା କ୍ଷୟକ୍ଷତି",
        "Traffic/Safety": "ଟ୍ରାଫିକ୍ / ସୁରକ୍ଷା",
        "Other": "ଅନ୍ୟାନ୍ୟ"
    },
    "statuses": {
        "SUBMITTED": "ଦାଖଲ ହୋଇଛି",
        "AI_ANALYZED": "AI ଦ୍ୱାରା ବିଶ୍ଳେଷିତ",
        "AWAITING_ADMIN_CLASSIFICATION": "ବର୍ଗୀକରଣ ଅପେକ୍ଷାରେ",
        "CLASSIFIED_SIMPLE": "ସାଧାରଣ ବର୍ଗୀକୃତ",
        "CLASSIFIED_COMPLEX": "ଜଟିଳ ଆହ୍ୱାନ",
        "UNDER_REVIEW": "ସମୀକ୍ଷାଧୀନ",
        "TRIAGED": "ବିଚାର ହୋଇଛି",
        "ASSIGNED": "ନ୍ୟସ୍ତ କରାଯାଇଛି",
        "IN_PROGRESS": "ଚାଲୁ ରହିଛି",
        "PARTIALLY_COMPLETED": "ଆଂଶିକ ସମ୍ପୂର୍ଣ୍ଣ",
        "RESOLVED": "ସମାଧାନ ହୋଇଛି",
        "CITIZEN_VERIFIED": "ନାଗରିକ ପ୍ରମାଣିତ",
        "VERIFIED": "ପ୍ରମାଣିତ",
        "REOPENED": "ପୁନଃ ଖୋଲାଯାଇଛି",
        "REJECTED": "ପ୍ରତ୍ୟାଖ୍ୟାନ",
        "ESCALATED_TO_INNOVATION": "ଗବେଷଣାକୁ ପଠାଯାଇଛି"
    },
    "priorities": {
        "LOW": "କମ୍",
        "MEDIUM": "ମଧ୍ୟମ",
        "HIGH": "ଉଚ୍ଚ",
        "URGENT": "ଜରୁରୀ",
        "all": "ସମସ୍ତ ପ୍ରାଥମିକତା"
    },
    "departments": {
        "Roads & Infrastructure": "ରାସ୍ତାଘାଟ ଓ ଭିତ୍ତିଭୂମି",
        "Sanitation & Waste Management": "ସ୍ୱଚ୍ଛତା ଓ ବର୍ଜ୍ୟବସ୍ତୁ ପରିଚାଳନା",
        "Electricity & Lighting": "ବିଦ୍ୟୁତ୍ ଓ ଆଲୋକ ବ୍ୟବସ୍ଥା",
        "Water Supply & Sewerage": "ଜଳ ଯୋଗାଣ ଓ ନର୍ଦ୍ଦମା ନିଷ୍କାସନ",
        "Public Safety & Traffic": "ଜନ ସୁରକ୍ଷା ଓ ଟ୍ରାଫିକ୍",
        "Health & Environment": "ସ୍ୱାସ୍ଥ୍ୟ ଓ ପରିବେଶ",
        "General Administration": "ସାଧାରଣ ପ୍ରଶାସନ"
    },
    "citizen": {
        "dashboard": {
            "tag": "ନାଗରିକ ସେବା କେନ୍ଦ୍ର",
            "welcome": "ସ୍ୱାଗତ, {{name}}",
            "subtitle": "ଆପଣଙ୍କ ଅଞ୍ଚଳର ପୌର ସମସ୍ୟା ଅଭିଯୋଗ କରନ୍ତୁ, ପ୍ରଗତି ଟ୍ରାକ୍ କରନ୍ତୁ ଏବଂ ସମାଧାନ ଯାଞ୍ଚ କରନ୍ତୁ।",
            "reportButton": "ସମସ୍ୟା ଦାଖଲ କରନ୍ତୁ",
            "viewReportsButton": "ମୋର ଅଭିଯୋଗ ଦେଖନ୍ତୁ",
            "stats": {
                "total": "ମୋଟ ଅଭିଯୋଗ",
                "totalDesc": "ଦାଖଲ ହୋଇଥିବା ସମସ୍ତ ସମସ୍ୟା",
                "pending": "ସମୀକ୍ଷା ଅପେକ୍ଷାରେ",
                "pendingDesc": "ପୌର ପ୍ରଶାସନର ନିଷ୍ପତ୍ତି ଅପେକ୍ଷାରେ",
                "inProgress": "କାର୍ଯ୍ୟ ଚାଲୁ ରହିଛି",
                "inProgressDesc": "ସ୍ଥଳବିଶେଷରେ କାମ ଚାଲିଛି",
                "resolved": "ସମାଧାନ ହୋଇଛି",
                "resolvedDesc": "ସମ୍ପୂର୍ଣ୍ଣ ଓ ଯାଞ୍ଚ ହୋଇଛି"
            },
            "verificationNotice": {
                "single": "1ଟି ସମାଧାନ ହୋଇଥିବା ସମସ୍ୟାର ସ୍ଥଳ ଯାଞ୍ଚ ଆବଶ୍ୟକ",
                "multiple": "{{count}}ଟି ସମାଧାନ ହୋଇଥିବା ସମସ୍ୟାର ସ୍ଥଳ ଯାଞ୍ଚ ଆବଶ୍ୟକ",
                "description": "ପୌର କାର୍ଯ୍ୟ ସମାପ୍ତ ହୋଇଛି। ସମସ୍ୟାଟି ପ୍ରକୃତରେ ସମାଧାନ ହୋଇଛି କି ନାହିଁ ଦୟାକରି ନିଶ୍ଚିତ କରନ୍ତୁ।",
                "action": "ବର୍ତ୍ତମାନ ଯାଞ୍ଚ କରନ୍ତୁ"
            },
            "recentActivity": "ସାମ୍ପ୍ରତିକ କାର୍ଯ୍ୟକଳାପ",
            "latestReports": "ନୂତନ ଅଭିଯୋଗଗୁଡ଼ିକ",
            "viewAll": "ସମସ୍ତ ଦେଖନ୍ତୁ ({{count}})",
            "impact": {
                "tag": "ସାମାଜିକ ପ୍ରଭାବ",
                "title": "ପୌର ପ୍ରଶାସନକୁ ଉତ୍ତରଦାୟୀ କରିବା",
                "description": "ଆପଣଙ୍କ ପ୍ରତ୍ୟେକ ଅଭିଯୋଗ ପ୍ରଶାସନକୁ ଉତ୍ତରଦାୟୀ କରେ ଏବଂ ସହରକୁ ସ୍ୱଚ୍ଛ ଓ ସୁରକ୍ଷିତ ରଖିବାରେ ସାହାଯ୍ୟ କରେ।",
                "totalImpact": "ଆପଣଙ୍କ ମୋଟ ଅବଦାନ",
                "reports": "ଅଭିଯୋଗ",
                "registry": "ସହର ରେକର୍ଡରେ ପଞ୍ଜୀକୃତ",
                "resolutionRate": "ସମାଧାନ ହାର",
                "resolvedCount": "{{total}} ରୁ {{resolved}} ଟି ସମାଧାନ"
            },
            "empty": {
                "title": "କୌଣସି ଅଭିଯୋଗ ଦାଖଲ ହୋଇନାହିଁ",
                "description": "ଆପଣ ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ସମସ୍ୟା ଦାଖଲ କରିନାହାଁନ୍ତି। ଆପଣଙ୍କ ଅଞ୍ଚଳର ସମସ୍ୟାର ଫଟୋ ଉଠାଇ ପ୍ରଥମ ଅଭିଯୋଗ କରନ୍ତୁ।",
                "primaryAction": "ବର୍ତ୍ତମାନ ଅଭିଯୋଗ କରନ୍ତୁ",
                "secondaryAction": "ତାଲିକା ଦେଖନ୍ତୁ"
            },
            "loadError": "ଆପଣଙ୍କ ଅଭିଯୋଗ ଲୋଡ୍ କରିବାରେ ଅସମର୍ଥ।"
        },
        "report": {
            "tag": "ନାଗରିକ ଅଭିଯୋଗ ଦାଖଲ",
            "title": "ନାଗରିକ ସମସ୍ୟା ଦାଖଲ କରନ୍ତୁ",
            "description": "ଭିତ୍ତିଭୂମି, ସ୍ୱଚ୍ଛତା ବା ସୁରକ୍ଷା ସମ୍ବନ୍ଧୀୟ ଅଭିଯୋଗ କରନ୍ତୁ। ଆପଣଙ୍କ ରିପୋର୍ଟ ସିଧାସଳଖ ଅଧିକାରୀଙ୍କ ପାଖରେ ପହଞ୍ଚିବ।",
            "steps": {
                "step1": "1",
                "step1Title": "ସମସ୍ୟାର ବିବରଣୀ ଦିଅନ୍ତୁ",
                "step1Subtitle": "ଆପଣ କେଉଁ ସମସ୍ୟା ବିଷୟରେ ଜଣାଉଛନ୍ତି?",
                "step2": "2",
                "step2Title": "ସ୍ଥାନ ନିର୍ଦ୍ଧାରଣ କରନ୍ତୁ",
                "step2Subtitle": "ସମସ୍ୟାଟି କେଉଁଠାରେ ଅଛି?",
                "step3": "3",
                "step3Title": "ଫଟୋ ସଂଲଗ୍ନ କରନ୍ତୁ",
                "step3Subtitle": "ସମସ୍ୟାର ଫଟୋ ପ୍ରମାଣ ଦିଅନ୍ତୁ",
                "step4": "4",
                "step4Title": "ଦାଖଲ କରିବାକୁ ପ୍ରସ୍ତୁତ?",
                "step4Subtitle": "ଦାଖଲ କରିବା ପୂର୍ବରୁ ସମସ୍ତ ବିବରଣୀ ଯାଞ୍ଚ କରିନିଅନ୍ତୁ।"
            },
            "fields": {
                "titleLabel": "ସମସ୍ୟାର ଶୀର୍ଷକ",
                "titlePlaceholder": "ଯଥା: ଖରାପ ଷ୍ଟ୍ରିଟ୍ ଲାଇଟ୍, ଆବର୍ଜନା କୁଣ୍ଡ, ରାସ୍ତାରେ ବଡ଼ ଖାଲ",
                "categoryLabel": "ବର୍ଗ",
                "categorySelect": "ଏକ ବର୍ଗ ଚୟନ କରନ୍ତୁ",
                "descriptionLabel": "ବିସ୍ତୃତ ବିବରଣୀ",
                "descriptionPlaceholder": "ସମସ୍ୟା ବିଷୟରେ ପୂର୍ଣ୍ଣ ବିବରଣୀ ଦିଅନ୍ତୁ: ସଠିକ୍ ସ୍ଥାନ, ବିପଦ, କେତେ ଦିନରୁ ଅଛି...",
                "locationLabel": "ସ୍ଥାନ ଓ ଚିହ୍ନଟ ସ୍ଥଳ",
                "locationPlaceholder": "ଯଥା: ମେଟ୍ରୋ ପିଲାର 142 ପାଖରେ, ଜୁବିଲି ହିଲ୍ସ ରୋଡ୍ ନଂ 36",
                "gpsTitle": "GPS ଅବସ୍ଥିତି",
                "gpsDescription": "କୋଅର୍ଡିନେଟ୍ ଯୋଡ଼ିବା ଦ୍ୱାରା କର୍ମଚାରୀମାନେ ଶୀଘ୍ର ସ୍ଥାନ ଖୋଜି ପାରିବେ।",
                "gpsButton": "ମୋର ବର୍ତ୍ତମାନର ସ୍ଥାନ ବ୍ୟବହାର କରନ୍ତୁ",
                "gpsDetecting": "GPS ଖୋଜା ଚାଲିଛି...",
                "gpsCaptured": "ସ୍ଥାନ ମିଳିଲା: {{lat}}, {{lng}}",
                "gpsAccuracy": " (±{{accuracy}}ମି)",
                "photoUploadTitle": "ଫଟୋ ଉଠାଇବା କିମ୍ବା ବାଛିବା ପାଇଁ କ୍ଲିକ୍ କରନ୍ତୁ",
                "photoUploadDesc": "JPG, PNG, HEIC, WebP ସମର୍ଥିତ। ଅପଲୋଡ୍ ପୂର୍ବରୁ ଫଟୋଗୁଡ଼ିକ ଆପେ ଆପେ କମ୍ପ୍ରେସ୍ ହୋଇଥାଏ।",
                "selectFile": "ଫାଇଲ୍ ବାଛନ୍ତୁ",
                "processingFile": "ପ୍ରକ୍ରିୟାକରଣ ଚାଲିଛି...",
                "removePhoto": "ହଟାନ୍ତୁ"
            },
            "voice": {
                "speakButton": "ଭଏସ୍ ମାଧ୍ୟମରେ କୁହନ୍ତୁ",
                "listening": "ଶୁଣୁଛି... ବର୍ତ୍ତମାନ କୁହନ୍ତୁ",
                "stop": "ବନ୍ଦ କରନ୍ତୁ",
                "transcribing": "AI ଦ୍ୱାରା ଲେଖାକୁ ରୂପାନ୍ତର ଚାଲିଛି...",
                "detectedLanguage": "{{language}} ଭାଷାରେ ଚିହ୍ନଟ",
                "replaceOrAppend": "ଲେଖା ପ୍ରସ୍ତୁତ। ତଳେ ଯାଞ୍ଚ କିମ୍ବା ସଂଶୋଧନ କରନ୍ତୁ।",
                "micPermissionDenied": "ମାଇକ୍ରୋଫୋନ୍ ଅନୁମତି ମିଳିଲା ନାହିଁ। ବ୍ରାଉଜର୍ ସେଟିଂସରେ ଅନୁମତି ଦିଅନ୍ତୁ।",
                "micNotSupported": "ଏହି ବ୍ରାଉଜରରେ ଭଏସ୍ ରେକର୍ଡିଂ ସୁବିଧା ଉପଲବ୍ଧ ନାହିଁ।",
                "transcriptionFailed": "ଭଏସ୍ ରୂପାନ୍ତର ବିଫଳ ହେଲା। ପୁନଃ ଚେଷ୍ଟା କରନ୍ତୁ କିମ୍ବା ଟାଇପ୍ କରନ୍ତୁ।",
                "reviewTitle": "ଭଏସ୍ ଲେଖା ସମୀକ୍ଷା",
                "originalTextLabel": "ମୂଳ କଥିତ ଲେଖା",
                "englishTranslationLabel": "ଇଂରାଜୀ ଅନୁବାଦ",
                "useTranscription": "ଏହି ଲେଖା ବ୍ୟବହାର କରନ୍ତୁ",
                "recordAgain": "ପୁନର୍ବାର ରେକର୍ଡ କରନ୍ତୁ",
                "discard": "ବାତିଲ କରନ୍ତୁ"
            },
            "stages": {
                "idle": "ଦାଖଲ କରିବାକୁ ପ୍ରସ୍ତୁତ",
                "saving": "ଅଭିଯୋଗ ପଞ୍ଜୀକରଣ ଚାଲିଛି...",
                "uploading": "ଫଟୋ ଅପଲୋଡ୍ ହେଉଛି...",
                "finalizing": "ଅଭିଯୋଗ ଚୂଡ଼ାନ୍ତ ହେଉଛି..."
            },
            "submitButton": "ନାଗରିକ ରିପୋର୍ଟ ଦାଖଲ କରନ୍ତୁ",
            "successModal": {
                "tag": "ଅଭିଯୋଗ ସଫଳତାର ସହ ଦାଖଲ ହୋଇଛି",
                "title": "ଆପଣଙ୍କ ଅଭିଯୋଗ ପଞ୍ଜୀକୃତ ହୋଇଛି!",
                "refText": "CivicFix ଆପଣଙ୍କ ଅଭିଯୋଗ ଗ୍ରହଣ କରି ରେଫରେନ୍ସ ନମ୍ବର ଦେଇଛି",
                "summary": "ଅଭିଯୋଗ ସାରାଂଶ",
                "titleField": "ଶୀର୍ଷକ",
                "categoryField": "ବର୍ଗ",
                "statusField": "ସ୍ଥିତି",
                "submittedAtField": "ଦାଖଲ ସମୟ",
                "viewIssue": "ମୋର ଅଭିଯୋଗ ଦେଖନ୍ତୁ",
                "backToDashboard": "ଡ୍ୟାସବୋର୍ଡକୁ ଫେରନ୍ତୁ"
            },
            "partialErrorModal": {
                "tag": "ବିଜ୍ଞପ୍ତି ସହ ସଂରକ୍ଷିତ",
                "title": "ଆପଣଙ୍କ ଅଭିଯୋଗ ସୃଷ୍ଟି ହୋଇଛି",
                "description": "ଅଭିଯୋଗ ଡାଟାବେସରେ ରହିଛି, କିନ୍ତୁ ଫଟୋ ଅପଲୋଡ୍ ସମ୍ପୂର୍ଣ୍ଣ ହୋଇପାରିଲା ନାହିଁ।",
                "viewIssues": "ମୋର ଅଭିଯୋଗ ଦେଖନ୍ତୁ",
                "backToDashboard": "ଡ୍ୟାସବୋର୍ଡକୁ ଫେରନ୍ତୁ"
            },
            "validation": {
                "title": "ଦୟାକରି ଏକ ଶୀର୍ଷକ ପ୍ରଦାନ କରନ୍ତୁ।",
                "description": "ଦୟାକରି ସମସ୍ୟାର ବିବରଣୀ ପ୍ରଦାନ କରନ୍ତୁ।",
                "category": "ଦୟାକରି ଏକ ବର୍ଗ ଚୟନ କରନ୍ତୁ।",
                "location": "ଦୟାକରି ସ୍ଥାନ କିମ୍ବା ଚିହ୍ନଟ ସ୍ଥଳ ଲେଖନ୍ତୁ।",
                "image": "ଦୟାକରି ଏକ JPG, PNG, HEIC କିମ୍ବା WebP ଫଟୋ ଚୟନ କରନ୍ତୁ।"
            }
        },
        "issues": {
            "tag": "ଅଭିଯୋଗ ପଞ୍ଜିକା",
            "title": "ମୋର ନାଗରିକ ଅଭିଯୋଗ",
            "description": "ଆପଣ ଦାଖଲ କରିଥିବା ପ୍ରତ୍ୟେକ ଅଭିଯୋଗ ଖୋଜନ୍ତୁ, ଫିଲ୍ଟର୍ କରନ୍ତୁ ଏବଂ ନଜର ରଖନ୍ତୁ।",
            "reportButton": "ସମସ୍ୟା ଦାଖଲ କରନ୍ତୁ",
            "searchPlaceholder": "ଶୀର୍ଷକ, ସ୍ଥାନ, ବର୍ଗ, ବିବରଣୀ ଅନୁଯାୟୀ ଖୋଜନ୍ତୁ...",
            "sortNewest": "ନୂତନ ପ୍ରଥମେ",
            "sortOldest": "ପୁରୁଣା ପ୍ରଥମେ",
            "filtersSort": "ଫିଲ୍ଟର୍ ଓ ସଜାଣି",
            "resetFilters": "ଫିଲ୍ଟର୍ ରିସେଟ୍ କରନ୍ତୁ",
            "showingCount": "{{total}} ରୁ {{filtered}} ଟି ଅଭିଯୋଗ ଦର୍ଶାଯାଉଛି",
            "sortedBy": "ସଜ୍ଜିତ: {{order}}",
            "empty": {
                "noReports": "କୌଣସି ଅଭିଯୋଗ ମିଳିଲା ନାହିଁ",
                "noReportsDesc": "ଆପଣ ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ଅଭିଯୋଗ ଦାଖଲ କରିନାହାଁନ୍ତି। ପ୍ରଥମ CivicFix ରିପୋର୍ଟ ସୃଷ୍ଟି କରନ୍ତୁ।",
                "noMatches": "ମେଳ ଖାଉଥିବା ଅଭିଯୋଗ ନାହିଁ",
                "noMatchesDesc": "ଖୋଜା ଯାଇଥିବା ମାନଦଣ୍ଡ ଅନୁଯାୟୀ କୌଣସି ଅଭିଯୋଗ ମିଳିଲା ନାହିଁ। ଫିଲ୍ଟର୍ ପରିବର୍ତ୍ତନ କରନ୍ତୁ।"
            },
            "filterLabels": {
                "all": "ସମସ୍ତ",
                "pending": "ବିଚାରାଧୀନ",
                "verified": "ପ୍ରମାଣିତ",
                "inProgress": "ଚାଲୁ ରହିଛି",
                "resolved": "ସମାଧାନ ହୋଇଛି",
                "reopened": "ପୁନଃ ଖୋଲାଯାଇଛି",
                "rejected": "ପ୍ରତ୍ୟାଖ୍ୟାତ"
            }
        },
        "issueDetails": {
            "backToReports": "ମୋର ଅଭିଯୋଗକୁ ଫେରନ୍ତୁ",
            "reportedOn": "{{date}} ରେ ଦାଖଲ ହୋଇଥିଲା",
            "reference": "ରେଫରେନ୍ସ #{{id}}",
            "descriptionSection": "ସମସ୍ୟା ବିବରଣୀ",
            "locationSection": "ସ୍ଥାନ ସୂଚନା",
            "landmark": "ଚିହ୍ନଟ ସ୍ଥଳ / ଠିକଣା",
            "coordinates": "GPS କୋଅର୍ଡିନେଟ୍",
            "openMap": "ମାନଚିତ୍ରରେ ଦେଖନ୍ତୁ",
            "photoSection": "ଫଟୋ ପ୍ରମାଣ",
            "initialPhoto": "ନାଗରିକ ଦେଇଥିବା ଫଟୋ",
            "resolutionPhoto": "ସମାଧାନ ପ୍ରମାଣ ଫଟୋ",
            "timelineSection": "ପ୍ରଗତି ଓ ଇତିହାସ",
            "deptAssignment": "ନ୍ୟସ୍ତ ବିଭାଗ",
            "originalLanguage": "ମୂଳ ଭାଷା",
            "inputMethod": "ଦାଖଲ ପ୍ରଣାଳୀ",
            "voiceInput": "ଭଏସ୍ ରେକର୍ଡିଂ",
            "textInput": "ଲିଖିତ ଲେଖା",
            "viewEnglish": "ଇଂରାଜୀ ଅନୁବାଦ ଦେଖନ୍ତୁ",
            "viewOriginal": "ମୂଳ ଲେଖା ଦେଖନ୍ତୁ ({{lang}})",
            "canonicalNotice": "ଏହି ରିପୋର୍ଟ {{lang}} ରେ ଦାଖଲ କରାଯାଇଥିଲା ଏବଂ ପୌର କାର୍ଯ୍ୟ ପାଇଁ ଇଂରାଜୀରେ ଅନୁବାଦ ହୋଇଛି।",
            "verificationCard": {
                "title": "ସ୍ଥଳ ଯାଞ୍ଚ ଆବଶ୍ୟକ",
                "description": "ପୌର ଦଳ ଏହି ସମସ୍ୟା ସମାଧାନ ହୋଇଛି ବୋଲି ଚିହ୍ନଟ କରିଛନ୍ତି। ସମସ୍ୟା ପ୍ରକୃତରେ ସମାଧାନ ହୋଇଛି କି?",
                "yesButton": "ହଁ, ସମସ୍ୟା ସମାଧାନ ହୋଇଛି",
                "noButton": "ନାହିଁ, ଏବେ ବି ସମସ୍ୟା ଅଛି (ପୁନଃ ଖୋଲନ୍ତୁ)",
                "verifiedYes": "ସମସ୍ୟା ସମାଧାନ ହୋଇଥିବା ଆପଣ ନିଶ୍ଚିତ କଲେ। ଧନ୍ୟବାଦ!",
                "verifiedNo": "ସମସ୍ୟା ସମାଧାନ ହୋଇନଥିବା ଆପଣ ଜଣାଇଛନ୍ତି। ଏହା ପୁନଃ ଅନୁସନ୍ଧାନ ପାଇଁ ପଠାଗଲା।"
            },
            "reopenModal": {
                "title": "ଅଭିଯୋଗ ପୁନର୍ବାର ଖୋଲନ୍ତୁ",
                "description": "କର୍ମଚାରୀମାନେ ପଦକ୍ଷେପ ନେବା ପାଇଁ କାରଣ ବର୍ଣ୍ଣନା କରନ୍ତୁ।",
                "feedbackLabel": "ପୁନଃ ଖୋଲିବାର କାରଣ",
                "feedbackPlaceholder": "ଯଥା: ଲାଇଟ୍ ମରାମତି ହୋଇଥିଲା କିନ୍ତୁ ପରଦିନ ପୁଣି ବନ୍ଦ ହୋଇଗଲା...",
                "submitReopen": "ଅଭିଯୋଗ ପୁନଃ ଖୋଲନ୍ତୁ",
                "cancel": "ବାତିଲ କରନ୍ତୁ"
            }
        },
        "notifications": {
            "tag": "ବିଜ୍ଞପ୍ତି କେନ୍ଦ୍ର",
            "title": "ନାଗରିକ ସତର୍କତା ଓ ଅପଡେଟ୍",
            "description": "ଆପଣ ଦାଖଲ କରିଥିବା ସମସ୍ୟାର ସ୍ଥିତି ଏବଂ ପୌର କାର୍ଯ୍ୟାନୁଷ୍ଠାନ ସମ୍ପର୍କରେ ଅବଗତ ରୁହନ୍ତୁ।",
            "emptyTitle": "କୌଣସି ବିଜ୍ଞପ୍ତି ନାହିଁ",
            "emptyDescription": "ଆପଣ ସମସ୍ତ ଅପଡେଟ୍ ଦେଖିସାରିଛନ୍ତି! ନୂତନ ବିଜ୍ଞପ୍ତି ଏଠାରେ ଦେଖାଯିବ।",
            "today": "ଆଜି",
            "earlier": "ପୂର୍ବରୁ",
            "total": "ମୋଟ",
            "unread": "ପଢ଼ାଯାଇନଥିବା",
            "read": "ପଢ଼ାଯାଇଛି",
            "unreadBadge": "ପଢ଼ାଯାଇନଥିବା",
            "loadError": "ବିଜ୍ଞପ୍ତି ଲୋଡ୍ କରିବାରେ ଅସମର୍ଥ।"
        },
        "userMenu": {
            "accountMenu": "ବ୍ୟବହାରକାରୀ ଖାତା ମେନୁ",
            "signOut": "ସାଇନ୍ ଆଉଟ୍"
        }
    }
}

AS_DICT = {
    "common": {
        "loading": "লোড হৈ আছে...",
        "error": "ত্ৰুটি",
        "tryAgain": "পুনৰ চেষ্টা কৰক",
        "back": "উভতি যাওক",
        "cancel": "বাতিল কৰক",
        "submit": "দাখিল কৰক",
        "save": "সংৰক্ষণ কৰক",
        "search": "সন্ধান কৰক",
        "reset": "পুনৰ নিৰ্ধাৰণ কৰক",
        "optional": "ঐচ্ছিক",
        "required": "প্ৰয়োজনীয়",
        "all": "সকলো",
        "viewDetails": "বিস্তাৰিত চাওক",
        "backToDashboard": "ডেচবৰ্ডলৈ উভতি যাওক",
        "workspace": "CivicFix কাৰ্যক্ষেত্ৰ",
        "close": "বন্ধ কৰক",
        "activeRole": "সক্ৰিয় ভূমিকা",
        "workflowPipeline": "কাৰ্যপ্ৰবাহ পাইপলাইন"
    },
    "nav": {
        "dashboard": "ডেচবৰ্ড",
        "reportIssue": "সমস্যা দাখিল কৰক",
        "myIssues": "মোৰ অভিযোগসমূহ",
        "notifications": "অধিসূচনা",
        "signOut": "ছাইন আউট",
        "activeRoleDesc": "{{role}} পৰিচালনাৰ বাবে CivicFix কাৰ্যক্ষেত্ৰ।"
    },
    "languages": LANGUAGES_BLOCK,
    "categories": {
        "Pothole": "পথৰ গাঁত",
        "Garbage": "আৱৰ্জনা",
        "Streetlight": "পথৰ লাইট",
        "Water Supply": "পানী যোগান",
        "Drainage": "নলা / নিকাশী ব্যৱস্থা",
        "Road Damage": "পথৰ ক্ষতি",
        "Traffic/Safety": "যান-বাহন / সুৰক্ষা",
        "Other": "অন্যান্য"
    },
    "statuses": {
        "SUBMITTED": "দাখিল কৰা হ'ল",
        "AI_ANALYZED": "AI দ্বাৰা বিশ্লেষণ কৰা হৈছে",
        "AWAITING_ADMIN_CLASSIFICATION": "শ্ৰেণীবিভাজন বাকী আছে",
        "CLASSIFIED_SIMPLE": "সাধাৰণ শ্ৰেণীবদ্ধ",
        "CLASSIFIED_COMPLEX": "জটিল প্ৰত্যাহ্বান",
        "UNDER_REVIEW": "পৰ্যালোচনাত আছে",
        "TRIAGED": "বাছনি কৰা হ'ল",
        "ASSIGNED": "নিয়োগ কৰা হ'ল",
        "IN_PROGRESS": "কাম চলি আছে",
        "PARTIALLY_COMPLETED": "আংশিক সম্পূৰ্ণ",
        "RESOLVED": "সমাধান হ'ল",
        "CITIZEN_VERIFIED": "নাগৰিক দ্বাৰা পৰীক্ষিত",
        "VERIFIED": "পৰীক্ষিত",
        "REOPENED": "পুনৰ খোলা হ'ল",
        "REJECTED": "প্ৰত্যাখ্যান কৰা হ'ল",
        "ESCALATED_TO_INNOVATION": "গৱেষণালৈ প্ৰেৰণ কৰা হ'ল"
    },
    "priorities": {
        "LOW": "কম",
        "MEDIUM": "মধ্যম",
        "HIGH": "উচ্চ",
        "URGENT": "জৰুৰী",
        "all": "সকলো অগ্ৰাধিকাৰ"
    },
    "departments": {
        "Roads & Infrastructure": "পথ আৰু আন্তঃগাঁথনি",
        "Sanitation & Waste Management": "পৰিষ্কাৰ-পৰিচ্ছন্নতা আৰু আৱৰ্জনা ব্যৱস্থাপনা",
        "Electricity & Lighting": "বিদ্যুৎ আৰু আলোকসজ্জা",
        "Water Supply & Sewerage": "পানী যোগান আৰু নিষ্কাশন",
        "Public Safety & Traffic": "জন সুৰক্ষা আৰু যাতায়াত",
        "Health & Environment": "স্বাস্থ্য আৰু পৰিৱেশ",
        "General Administration": "সাধাৰণ প্ৰশাসন"
    },
    "citizen": {
        "dashboard": {
            "tag": "নাগৰিক সেৱা কেন্দ্ৰ",
            "welcome": "স্বাগতম, {{name}}",
            "subtitle": "আপোনাৰ অঞ্চলৰ নাগৰিক সমস্যা দাখিল কৰক, পৌৰসভাৰ অগ্ৰগতি নিৰীক্ষণ কৰক আৰু সমাধান পৰীক্ষা কৰক।",
            "reportButton": "সমস্যা দাখিল কৰক",
            "viewReportsButton": "মোৰ প্ৰতিবেদন চাওক",
            "stats": {
                "total": "মুঠ প্ৰতিবেদন",
                "totalDesc": "দাখিল কৰা সকলো অভিযোগ",
                "pending": "পৰ্যালোচনা বাকী",
                "pendingDesc": "পৌৰসভাৰ সিদ্ধান্তৰ অপেক্ষাত",
                "inProgress": "কাম চলি আছে",
                "inProgressDesc": "ক্ষেত্ৰ পৰ্যায়ত কাম অব্যাহত",
                "resolved": "সমাধান হ'ল",
                "resolvedDesc": "সম্পূৰ্ণ আৰু পৰীক্ষিত"
            },
            "verificationNotice": {
                "single": "১টা সমাধান হোৱা সমস্যাৰ ক্ষেত্ৰ পৰীক্ষণ প্ৰয়োজন",
                "multiple": "{{count}}টা সমাধান হোৱা সমস্যাৰ ক্ষেত্ৰ পৰীক্ষণ প্ৰয়োজন",
                "description": "পৌৰসভাই কাম সম্পূৰ্ণ কৰিছে। সমস্যা সমাধান হৈছে নে নাই অনুগ্ৰহ কৰি নিশ্চিত কৰক।",
                "action": "এতিয়াই পৰীক্ষা কৰক"
            },
            "recentActivity": "শেহতীয়া কাৰ্যকলাপ",
            "latestReports": "শেহতীয়া নাগৰিক প্ৰতিবেদন",
            "viewAll": "সকলো চাওক ({{count}})",
            "impact": {
                "tag": "সামাজিক প্ৰভাৱ",
                "title": "পৌৰ প্ৰশাসনক দায়বদ্ধ কৰা",
                "description": "আপোনাৰ প্ৰতিটো অভিযোগে প্ৰশাসনক দায়বদ্ধ কৰে আৰু চহৰখনক পৰিষ্কাৰ আৰু সুৰক্ষিত ৰখাত সহায় কৰে।",
                "totalImpact": "আপোনাৰ মুঠ অৱদান",
                "reports": "প্ৰতিবেদন",
                "registry": "পৌৰ নথিত অন্তৰ্ভুক্ত",
                "resolutionRate": "সমাধানৰ হাৰ",
                "resolvedCount": "{{total}} ৰ ভিতৰত {{resolved}} সমাধান"
            },
            "empty": {
                "title": "এতিয়ালৈকে কোনো অভিযোগ দাখিল হোৱা নাই",
                "description": "আপুনি এতিয়ালৈকে কোনো সমস্যা দাখিল কৰা নাই। সমস্যাৰ ফটো তুলি প্ৰথম প্ৰতিবেদন জমা দিয়ক।",
                "primaryAction": "এতিয়াই সমস্যা দাখিল কৰক",
                "secondaryAction": "সমস্যাৰ তালিকা চাওক"
            },
            "loadError": "আপোনাৰ প্ৰতিবেদনসমূহ লোড কৰিব পৰা নগ'ল।"
        },
        "report": {
            "tag": "নাগৰিক অভিযোগ পঞ্জীয়ন",
            "title": "নাগৰিক সমস্যা দাখিল কৰক",
            "description": "আন্তঃগাঁথনি, পৰিষ্কাৰ-পৰিচ্ছন্নতা বা সুৰক্ষা সম্পৰ্কীয় অভিযোগ জনাওক। আপোনাৰ প্ৰতিবেদন পোনে পোনে বিষয়াসকলৰ ওচৰ পাব।",
            "steps": {
                "step1": "১",
                "step1Title": "সমস্যাৰ বিৱৰণ দিয়ক",
                "step1Subtitle": "আপুনি কি সমস্যাৰ কথা জনাইছে?",
                "step2": "২",
                "step2Title": "স্থান নিৰ্ধাৰণ কৰক",
                "step2Subtitle": "সমস্যাটো ক'ত আছে?",
                "step3": "৩",
                "step3Title": "ফটো সংলগ্ন কৰক",
                "step3Subtitle": "সমস্যাৰ স্পষ্ট ফটো প্ৰমাণ দিয়ক",
                "step4": "৪",
                "step4Title": "দাখিল কৰিবলৈ সাজু?",
                "step4Subtitle": "দাখিল কৰাৰ পূৰ্বে তথ্যসমূহ পুনৰ পৰীক্ষা কৰক।"
            },
            "fields": {
                "titleLabel": "সমস্যাৰ শিৰোনাম",
                "titlePlaceholder": "যেনে: ভঙা পথৰ লাইট, আৱৰ্জনাৰ স্তূপ, পথৰ গভীৰ গাঁত",
                "categoryLabel": "শ্ৰেণী",
                "categorySelect": "এটা শ্ৰেণী বাছক",
                "descriptionLabel": "বিৱৰণ",
                "descriptionPlaceholder": "সমস্যাৰ বিষয়ে সম্পূৰ্ণ বিৱৰণ দিয়ক: সঠিক স্থান, বিপদৰ আশংকা, কিমান দিনৰ পৰা আছে...",
                "locationLabel": "স্থান আৰু পৰিচিত স্থান",
                "locationPlaceholder": "যেনে: মেট্ৰ' স্তম্ভ ১৪২ৰ ওচৰত, জুবেলি হিলছ ৰোড নং ৩৬",
                "gpsTitle": "GPS অৱস্থান",
                "gpsDescription": "অৱস্থান যোগ কৰিলে কৰ্মীসকলে সোনকালে স্থান বিচাৰি পোৱাত সহায় হয়।",
                "gpsButton": "মোৰ বৰ্তমানৰ অৱস্থান ব্যৱহাৰ কৰক",
                "gpsDetecting": "GPS সন্ধান কৰা হৈছে...",
                "gpsCaptured": "অৱস্থান পোৱা গ'ল: {{lat}}, {{lng}}",
                "gpsAccuracy": " (±{{accuracy}}মি)",
                "photoUploadTitle": "ফটো তুলিবলৈ বা বাছনি কৰিবলৈ ক্লিক কৰক",
                "photoUploadDesc": "JPG, PNG, HEIC, WebP সমৰ্থিত। আপলোডৰ পূৰ্বে ফটোসমূহ নিজে নিজে সংকুচিত হ'ব।",
                "selectFile": "ফাইল বাছক",
                "processingFile": "প্ৰক্ৰিয়াকৰণ হৈ আছে...",
                "removePhoto": "আঁতৰাওক"
            },
            "voice": {
                "speakButton": "মুখেৰে কৈ বিৱৰণ দিয়ক",
                "listening": "শুনি আছো... এতিয়া কওক",
                "stop": "বন্ধ কৰক",
                "transcribing": "AI দ্বাৰা পাঠলৈ ৰূপান্তৰ কৰা হৈছে...",
                "detectedLanguage": "{{language}} ভাষাত চিনাক্ত",
                "replaceOrAppend": "পাঠ প্ৰস্তুত। তলত পৰীক্ষা কৰক বা সম্পাদন কৰক।",
                "micPermissionDenied": "মাইক্ৰ'ফোনৰ অনুমতি অস্বীকাৰ কৰা হ'ল। ব্ৰাউজাৰ চেটিংছত অনুমতি দিয়ক।",
                "micNotSupported": "এই ব্ৰাউজাৰত ভইচ ৰেকৰ্ডিং সুবিধা নাই।",
                "transcriptionFailed": "ভইচ ৰূপান্তৰ ব্যৰ্থ হ'ল। অনুগ্ৰহ কৰি পুনৰ চেষ্টা কৰক বা টাইপ কৰক।",
                "reviewTitle": "ভইচ পাঠ পৰ্যালোচনা",
                "originalTextLabel": "মূল কোৱা পাঠ",
                "englishTranslationLabel": "ইংৰাজী অনুবাদ",
                "useTranscription": "এই পাঠ ব্যৱহাৰ কৰক",
                "recordAgain": "পুনৰ ৰেকৰ্ড কৰক",
                "discard": "বাতিল কৰক"
            },
            "stages": {
                "idle": "দাখিল কৰিবলৈ সাজু",
                "saving": "সমস্যা পঞ্জীয়ন কৰা হৈছে...",
                "uploading": "ফটো আপলোড কৰা হৈছে...",
                "finalizing": "প্ৰতিবেদন চূড়ান্ত কৰা হৈছে..."
            },
            "submitButton": "নাগৰিক প্ৰতিবেদন দাখিল কৰক",
            "successModal": {
                "tag": "প্ৰতিবেদন সফলতাৰে দাখিল হ'ল",
                "title": "আপোনাৰ প্ৰতিবেদন পঞ্জীয়ন হ'ল!",
                "refText": "CivicFix-এ আপোনাৰ অভিযোগ অন্তৰ্ভুক্ত কৰি প্ৰসংগ নম্বৰ প্ৰদান কৰিছে",
                "summary": "প্ৰতিবেদনৰ সাৰাংশ",
                "titleField": "শিৰোনাম",
                "categoryField": "শ্ৰেণী",
                "statusField": "স্থিতি",
                "submittedAtField": "দাখিলৰ সময়",
                "viewIssue": "মোৰ সমস্যা চাওক",
                "backToDashboard": "ডেচবৰ্ডলৈ উভতি যাওক"
            },
            "partialErrorModal": {
                "tag": "বিজ্ঞপ্তি সহ প্ৰতিবেদন সংৰক্ষিত",
                "title": "আপোনাৰ প্ৰতিবেদন তৈয়াৰ হ'ল",
                "description": "সমস্যাটো ডেটাবেছত পঞ্জীয়ন হৈছে, কিন্তু ফটো আপলোড সম্পূৰ্ণ নহ'ল।",
                "viewIssues": "মোৰ অভিযোগ চাওক",
                "backToDashboard": "ডেচবৰ্ডলৈ উভতি যাওক"
            },
            "validation": {
                "title": "অনুগ্ৰহ কৰি সমস্যাৰ শিৰোনাম দিয়ক।",
                "description": "অনুগ্ৰহ কৰি সমস্যাৰ বিৱৰণ দিয়ক।",
                "category": "অনুগ্ৰহ কৰি এটা শ্ৰেণী বাছক।",
                "location": "অনুগ্ৰহ কৰি স্থান বা পৰিচিত স্থান উল্লেখ কৰক।",
                "image": "অনুগ্ৰহ কৰি এটা JPG, PNG, HEIC বা WebP ফটো বাছক।"
            }
        },
        "issues": {
            "tag": "অভিযোগ পঞ্জী",
            "title": "মোৰ নাগৰিক অভিযোগসমূহ",
            "description": "আপোনাৰ চহৰত দাখিল কৰা প্ৰতিটো অভিযোগ সন্ধান, ফিল্টাৰ আৰু নিৰীক্ষণ কৰক।",
            "reportButton": "সমস্যা দাখিল কৰক",
            "searchPlaceholder": "শিৰোনাম, স্থান, শ্ৰেণী, বিৱৰণ অনুসৰি সন্ধান কৰক...",
            "sortNewest": "নতুন প্ৰথমে",
            "sortOldest": "পুৰণি প্ৰথমে",
            "filtersSort": "ফিল্টাৰ আৰু সজোৱা",
            "resetFilters": "ফিল্টাৰ ৰিচেট কৰক",
            "showingCount": "{{total}} ৰ ভিতৰত {{filtered}} টা প্ৰতিবেদন দেখুওৱা হৈছে",
            "sortedBy": "ক্ৰম: {{order}}",
            "empty": {
                "noReports": "কোনো প্ৰতিবেদন পোৱা নগ'ল",
                "noReportsDesc": "আপুনি এতিয়ালৈকে কোনো অভিযোগ দাখিল কৰা নাই। প্ৰথম CivicFix প্ৰতিবেদন তৈয়াৰ কৰক।",
                "noMatches": "মিল থকা অভিযোগ নাই",
                "noMatchesDesc": "বৰ্তমান সন্ধানৰ লগত কোনো অভিযোগ মিল খোৱা নাই। ফিল্টাৰ সলনি কৰি চাওক।"
            },
            "filterLabels": {
                "all": "সকলো",
                "pending": "অপেক্ষমাণ",
                "verified": "পৰীক্ষিত",
                "inProgress": "চলি থকা",
                "resolved": "সমাধান হোৱা",
                "reopened": "পুনৰ খোলা",
                "rejected": "প্ৰত্যাখ্যাত"
            }
        },
        "issueDetails": {
            "backToReports": "মোৰ প্ৰতিবেদনলৈ উভতি যাওক",
            "reportedOn": "{{date}} তাৰিখে দাখিল কৰা হৈছিল",
            "reference": "প্ৰসংগ #{{id}}",
            "descriptionSection": "সমস্যাৰ বিৱৰণ",
            "locationSection": "স্থানৰ তথ্য",
            "landmark": "পৰিচিত স্থান / ঠিকনা",
            "coordinates": "GPS স্থানাংক",
            "openMap": "মেপত চাওক",
            "photoSection": "ফটো প্ৰমাণ",
            "initialPhoto": "নাগৰিকে দাখিল কৰা ফটো",
            "resolutionPhoto": "সমাধানৰ প্ৰমাণ ফটো",
            "timelineSection": "অগ্ৰগতি আৰু ইতিবৃত্ত",
            "deptAssignment": "দায়িত্বপ্ৰাপ্ত বিভাগ",
            "originalLanguage": "মূল ভাষা",
            "inputMethod": "দাখিলৰ মাধ্যম",
            "voiceInput": "ভইচ ৰেকৰ্ডিং",
            "textInput": "লিখিত পাঠ",
            "viewEnglish": "ইংৰাজী অনুবাদ চাওক",
            "viewOriginal": "মূল চাওক ({{lang}})",
            "canonicalNotice": "এই প্ৰতিবেদনখন {{lang}} ভাষাত দাখিল কৰা হৈছিল আৰু পৌৰ কামৰ বাবে ইংৰাজীলৈ অনুবাদ কৰা হৈছে।",
            "verificationCard": {
                "title": "ক্ষেত্ৰ পৰীক্ষণ প্ৰয়োজন",
                "description": "পৌৰ দলে এই সমস্যা সমাধান হোৱা বুলি চিহ্নিত কৰিছে। সমস্যাটো সঁচাকৈ সমাধান হ'লনে?",
                "yesButton": "হয়, সমস্যা সমাধান হ'ল",
                "noButton": "নহয়, এতিয়াও সমস্যা আছে (পুনৰ খোলক)",
                "verifiedYes": "আপুনি সমাধান নিশ্চিত কৰিলে। ধন্যবাদ!",
                "verifiedNo": "আপুনি জনালে যে সমস্যা সমাধান হোৱা নাই। ইয়াক পুনৰ পৰীক্ষাৰ বাবে প্ৰেৰণ কৰা হ'ল।"
            },
            "reopenModal": {
                "title": "অভিযোগ পুনৰ খোলক",
                "description": "কৰ্মীসকলে ব্যৱস্থা গ্ৰহণ কৰিবলৈ কাৰণ বৰ্ণনা কৰক।",
                "feedbackLabel": "পুনৰ খোলাৰ কাৰণ",
                "feedbackPlaceholder": "যেনে: লাইট ঠিক কৰা হৈছিল কিন্তু পিছদিনাই পুনৰ নুমাই গ'ল...",
                "submitReopen": "অভিযোগ পুনৰ খোলক",
                "cancel": "বাতিল কৰক"
            }
        },
        "notifications": {
            "tag": "অধিসূচনা কেন্দ্ৰ",
            "title": "নাগৰিক সজাগতা আৰু আপডেইট",
            "description": "আপোনাৰ সমস্যাসমূহৰ স্থিতি আৰু পৌৰ ব্যৱস্থাৰ বিষয়ে জানিব পাৰিব।",
            "emptyTitle": "কোনো অধিসূচনা নাই",
            "emptyDescription": "আপুনি সকলো আপডেইট দেখিছে! নতুন অধিসূচনা ইয়াত দেখা যাব।",
            "today": "আজি",
            "earlier": "পূৰ্বৰ",
            "total": "মুঠ",
            "unread": "নপঢ়া",
            "read": "পঢ়া",
            "unreadBadge": "নপঢ়া",
            "loadError": "অধিসূচনা লোড কৰিব পৰা নগ'ল।"
        },
        "userMenu": {
            "accountMenu": "ব্যৱহাৰকাৰী একাউণ্ট মেনু",
            "signOut": "ছাইন আউট"
        }
    }
}

UR_DICT = {
    "common": {
        "loading": "لوڈ ہو رہا ہے...",
        "error": "خرابی",
        "tryAgain": "دوبارہ کوشش کریں",
        "back": "پیچھے",
        "cancel": "منسوخ کریں",
        "submit": "جمع کریں",
        "save": "محفوظ کریں",
        "search": "تلاش کریں",
        "reset": "دوبارہ ترتیب دیں",
        "optional": "اختیاری",
        "required": "لازمی",
        "all": "تمام",
        "viewDetails": "تفصیلات دیکھیں",
        "backToDashboard": "ڈیش بورڈ پر واپس جائیں",
        "workspace": "CivicFix ورک اسپیس",
        "close": "بند کریں",
        "activeRole": "فعال کردار",
        "workflowPipeline": "ورک فلو پائپ لائن"
    },
    "nav": {
        "dashboard": "ڈیش بورڈ",
        "reportIssue": "مسئلہ درج کریں",
        "myIssues": "میری شکایات",
        "notifications": "اطلاعات",
        "signOut": "سائن آؤٹ",
        "activeRoleDesc": "{{role}} کارروائیوں کے لیے CivicFix ورک اسپیس۔"
    },
    "languages": LANGUAGES_BLOCK,
    "categories": {
        "Pothole": "سڑک کا گڑھا",
        "Garbage": "کوڑا کرکٹ",
        "Streetlight": "اسٹریٹ لائٹ",
        "Water Supply": "پانی کی فراہمی",
        "Drainage": "نکاسی آب",
        "Road Damage": "سڑک کی خرابی",
        "Traffic/Safety": "ٹریفک / حفاظت",
        "Other": "دیگر"
    },
    "statuses": {
        "SUBMITTED": "درج شدہ",
        "AI_ANALYZED": "AI سے تجزیہ شدہ",
        "AWAITING_ADMIN_CLASSIFICATION": "درجہ بندی کا انتظار",
        "CLASSIFIED_SIMPLE": "آسان مسئلہ",
        "CLASSIFIED_COMPLEX": "پیچیدہ چیلنج",
        "UNDER_REVIEW": "زیر جائزہ",
        "TRIAGED": "جانچ مکمل",
        "ASSIGNED": "تفویض شدہ",
        "IN_PROGRESS": "کام جاری ہے",
        "PARTIALLY_COMPLETED": "جزوی مکمل",
        "RESOLVED": "حل شدہ",
        "CITIZEN_VERIFIED": "شہری سے تصدیق شدہ",
        "VERIFIED": "تصدیق شدہ",
        "REOPENED": "دوبارہ کھولا گیا",
        "REJECTED": "مسترد",
        "ESCALATED_TO_INNOVATION": "تحقیق کے لیے بھیجا گیا"
    },
    "priorities": {
        "LOW": "کم",
        "MEDIUM": "درمیانی",
        "HIGH": "اعلیٰ",
        "URGENT": "فوری",
        "all": "تمام ترجیحات"
    },
    "departments": {
        "Roads & Infrastructure": "سڑکیں اور بنیادی ڈھانچہ",
        "Sanitation & Waste Management": "صفائی اور کچرا انتظام",
        "Electricity & Lighting": "بجلی اور اسٹریٹ لائٹس",
        "Water Supply & Sewerage": "پانی کی فراہمی اور سیوریج",
        "Public Safety & Traffic": "عوامی تحفظ اور ٹریفک",
        "Health & Environment": "صحت اور ماحولیات",
        "General Administration": "عمومی انتظامیہ"
    },
    "citizen": {
        "dashboard": {
            "tag": "شہری ایکشن سینٹر",
            "welcome": "خوش آمدید، {{name}}",
            "subtitle": "اپنے محلے کے شہری مسائل درج کریں، بلدیاتی پیشرفت پر نظر رکھیں اور زمینی حل کی تصدیق کریں۔",
            "reportButton": "مسئلہ درج کریں",
            "viewReportsButton": "میری شکایات دیکھیں",
            "stats": {
                "total": "کل شکایات",
                "totalDesc": "درج شدہ تمام شہری مسائل",
                "pending": "زیر جائزہ",
                "pendingDesc": "بلدیاتی جائزے کے منتظر",
                "inProgress": "جاری کام",
                "inProgressDesc": "میدانی سطح پر کام جاری ہے",
                "resolved": "حل شدہ",
                "resolvedDesc": "مکمل اور تصدیق شدہ"
            },
            "verificationNotice": {
                "single": "1 حل شدہ مسئلے پر آپ کی زمینی تصدیق درکار ہے",
                "multiple": "{{count}} حل شدہ مسائل پر آپ کی زمینی تصدیق درکار ہے",
                "description": "بلدیاتی کام مکمل ہو چکا ہے۔ برائے مہربانی تصدیق کریں کہ کیا مسئلہ واقعی حل ہو گیا ہے۔",
                "action": "ابھی تصدیق کریں"
            },
            "recentActivity": "حالیہ سرگرمی",
            "latestReports": "تازہ ترین شہری شکایات",
            "viewAll": "سب دیکھیں ({{count}})",
            "impact": {
                "tag": "کمیونٹی اثرات",
                "title": "بلدیاتی نظام کو جوابدہ بنانا",
                "description": "آپ کی ہر شکایت بلدیاتی اداروں کو جوابدہ بناتی ہے اور شہر کو صاف اور محفوظ رکھنے میں مدد دیتی ہے۔",
                "totalImpact": "آپ کا کل تعاون",
                "reports": "شکایات",
                "registry": "شہری رجسٹر میں درج",
                "resolutionRate": "حل کی شرح",
                "resolvedCount": "{{total}} میں سے {{resolved}} حل ہوئیں"
            },
            "empty": {
                "title": "ابھی تک کوئی شکایت درج نہیں کی گئی",
                "description": "آپ نے ابھی تک کوئی شہری مسئلہ درج نہیں کیا۔ اپنے علاقے کے مسئلے کی تصویر کھینچیں اور پہلی شکایت درج کریں۔",
                "primaryAction": "ابھی شکایت درج کریں",
                "secondaryAction": "شکایات کی فہرست دیکھیں"
            },
            "loadError": "آپ کی شکایات لوڈ کرنے میں ناکامی۔"
        },
        "report": {
            "tag": "شہری شکایت اندراج",
            "title": "شہری مسئلہ درج کریں",
            "description": "بنیادی ڈھانچے، صفائی یا حفاظت سے متعلق شکایت درج کریں۔ آپ کی رپورٹ براہ راست متعلقہ حکام کو پہنچائی جائے گی۔",
            "steps": {
                "step1": "1",
                "step1Title": "مسئلے کی وضاحت کریں",
                "step1Subtitle": "آپ کس مسئلے کی اطلاع دے رہے ہیں؟",
                "step2": "2",
                "step2Title": "مقام متعین کریں",
                "step2Subtitle": "مسئلہ کہاں واقع ہے؟",
                "step3": "3",
                "step3Title": "تصویر منسلک کریں",
                "step3Subtitle": "مسئلے کا تصویری ثبوت فراہم کریں",
                "step4": "4",
                "step4Title": "جمع کرانے کے لیے تیار؟",
                "step4Subtitle": "جمع کرانے سے پہلے تمام تفصیلات کی جانچ کر لیں۔"
            },
            "fields": {
                "titleLabel": "مسئلے کا عنوان",
                "titlePlaceholder": "مثلاً: ٹوٹی ہوئی اسٹریٹ لائٹ، کوڑے کا ڈھیر، گہرا گڑھا",
                "categoryLabel": "زمرہ",
                "categorySelect": "ایک زمرہ منتخب کریں",
                "descriptionLabel": "تفصیل",
                "descriptionPlaceholder": "مسئلے کی مکمل تفصیل دیں: صحیح جگہ، خطرہ، کب سے موجود ہے...",
                "locationLabel": "مقام اور نشانی",
                "locationPlaceholder": "مثلاً: میٹرو پلر 142 کے قریب، جوبلی ہلز روڈ نمبر 36",
                "gpsTitle": "GPS لوکیشن",
                "gpsDescription": "نقشے کے نقاط منسلک کرنے سے عملے کو صحیح جگہ تلاش کرنے میں آسانی ہوتی ہے۔",
                "gpsButton": "میرا موجودہ مقام استعمال کریں",
                "gpsDetecting": "GPS تلاش کیا جا رہا ہے...",
                "gpsCaptured": "مقام حاصل ہوا: {{lat}}, {{lng}}",
                "gpsAccuracy": " (±{{accuracy}}میٹر)",
                "photoUploadTitle": "تصویر لینے یا منتخب کرنے کے لیے کلک کریں",
                "photoUploadDesc": "JPG, PNG, HEIC, WebP معاون ہیں۔ اپ لوڈ سے پہلے تصاویر خود بخود کمپریس ہو جائیں گی۔",
                "selectFile": "فائل منتخب کریں",
                "processingFile": "عمل جاری ہے...",
                "removePhoto": "حذف کریں"
            },
            "voice": {
                "speakButton": "بول کر تفصیل بتائیں",
                "listening": "سن رہا ہے... اب بولیں",
                "stop": "روکیں",
                "transcribing": "AI متن میں تبدیل کر رہا ہے...",
                "detectedLanguage": "{{language}} میں شناخت شدہ",
                "replaceOrAppend": "متن تیار ہے۔ نیچے جانچیں یا ترمیم کریں۔",
                "micPermissionDenied": "مائیکروفون کی اجازت نہیں ملی۔ براؤزر کی ترتیبات میں اجازت دیں۔",
                "micNotSupported": "اس براؤزر میں آواز ریکارڈنگ کی سہولت دستیاب نہیں ہے۔",
                "transcriptionFailed": "آواز کی تبدیلی ناکام رہی۔ دوبارہ کوشش کریں یا ٹائپ کریں۔",
                "reviewTitle": "صوتی متن کا جائزہ",
                "originalTextLabel": "اصل بولا گیا متن",
                "englishTranslationLabel": "انگریزی ترجمہ",
                "useTranscription": "یہ متن استعمال کریں",
                "recordAgain": "دوبارہ ریکارڈ کریں",
                "discard": "رد کریں"
            },
            "stages": {
                "idle": "جمع کرنے کے لیے تیار",
                "saving": "شکایت درج ہو رہی ہے...",
                "uploading": "تصویر اپ لوڈ ہو رہی ہے...",
                "finalizing": "رپورٹ کو حتمی شکل دی جا رہی ہے..."
            },
            "submitButton": "شہری رپورٹ جمع کریں",
            "successModal": {
                "tag": "رپورٹ کامیابی سے درج ہو گئی",
                "title": "آپ کی شہری رپورٹ درج ہو چکی ہے!",
                "refText": "CivicFix نے آپ کی رپورٹ درج کر لی ہے اور حوالہ نمبر جاری کر دیا ہے",
                "summary": "رپورٹ کا خلاصہ",
                "titleField": "عنوان",
                "categoryField": "زمرہ",
                "statusField": "حالت",
                "submittedAtField": "اندراج کا وقت",
                "viewIssue": "میری شکایت دیکھیں",
                "backToDashboard": "ڈیش بورڈ پر واپس جائیں"
            },
            "partialErrorModal": {
                "tag": "اطلاع کے ساتھ رپورٹ محفوظ",
                "title": "آپ کی رپورٹ تیار ہو گئی",
                "description": "مسئلہ ڈیٹا بیس میں درج ہو گیا ہے لیکن تصویر اپ لوڈ نہیں ہو سکی۔",
                "viewIssues": "میری شکایات دیکھیں",
                "backToDashboard": "ڈیش بورڈ پر واپس جائیں"
            },
            "validation": {
                "title": "برائے مہربانی مسئلے کا عنوان درج کریں۔",
                "description": "برائے مہربانی مسئلے کی تفصیل درج کریں۔",
                "category": "برائے مہربانی زمرہ منتخب کریں۔",
                "location": "برائے مہربانی مقام یا نشانی درج کریں۔",
                "image": "برائے مہربانی ایک JPG, PNG, HEIC یا WebP تصویر منتخب کریں۔"
            }
        },
        "issues": {
            "tag": "شکایات کا رجسٹر",
            "title": "میری شہری شکایات",
            "description": "اپنے شہر میں درج کی گئی ہر شکایت کو تلاش کریں، فلٹر کریں اور اس پر نظر رکھیں۔",
            "reportButton": "مسئلہ درج کریں",
            "searchPlaceholder": "عنوان، مقام، زمرہ، تفصیل سے تلاش کریں...",
            "sortNewest": "تازہ ترین پہلے",
            "sortOldest": "پرانی پہلے",
            "filtersSort": "فلٹرز اور ترتیب",
            "resetFilters": "فلٹرز دوبارہ ترتیب دیں",
            "showingCount": "{{total}} میں سے {{filtered}} شکایات دکھائی جا رہی ہیں",
            "sortedBy": "ترتیب: {{order}}",
            "empty": {
                "noReports": "کوئی شکایت نہیں ملی",
                "noReportsDesc": "آپ نے ابھی تک کوئی شکایت درج نہیں کی۔ پہلی CivicFix رپورٹ بنا کر آغاز کریں۔",
                "noMatches": "کوئی مماثل شکایت نہیں",
                "noMatchesDesc": "موجودہ تلاش کے مطابق کوئی شکایت نہیں ملی۔ فلٹرز تبدیل کر کے دیکھیں۔"
            },
            "filterLabels": {
                "all": "تمام",
                "pending": "زیر التواء",
                "verified": "تصدیق شدہ",
                "inProgress": "جاری",
                "resolved": "حل شدہ",
                "reopened": "دوبارہ کھولا گیا",
                "rejected": "مسترد"
            }
        },
        "issueDetails": {
            "backToReports": "میری شکایات پر واپس",
            "reportedOn": "{{date}} کو درج کیا گیا",
            "reference": "حوالہ #{{id}}",
            "descriptionSection": "مسئلے کی تفصیل",
            "locationSection": "مقام کی معلومات",
            "landmark": "نشانی / پتہ",
            "coordinates": "GPS کوآرڈینیٹس",
            "openMap": "نقشے میں کھولیں",
            "photoSection": "تصویری ثبوت",
            "initialPhoto": "شہری کی فراہم کردہ تصویر",
            "resolutionPhoto": "حل کے ثبوت کی تصویر",
            "timelineSection": "پیشرفت اور تاریخ",
            "deptAssignment": "تفویض کردہ محکمہ",
            "originalLanguage": "اصل زبان",
            "inputMethod": "اندراج کا ذریعہ",
            "voiceInput": "صوتی ریکارڈنگ",
            "textInput": "تحریری متن",
            "viewEnglish": "انگریزی ترجمہ دیکھیں",
            "viewOriginal": "اصل متن دیکھیں ({{lang}})",
            "canonicalNotice": "یہ رپورٹ {{lang}} میں درج کی گئی تھی اور بلدیاتی کارروائی کے لیے انگریزی میں ترجمہ کی گئی ہے۔",
            "verificationCard": {
                "title": "زمینی تصدیق درکار ہے",
                "description": "بلدیاتی عملے نے اس مسئلے کو حل شدہ قرار دیا ہے۔ کیا مسئلہ واقعی حل ہو چکا ہے؟",
                "yesButton": "ہاں، مسئلہ حل ہو گیا ہے",
                "noButton": "نہیں، ابھی بھی مسئلہ ہے (دوبارہ کھولیں)",
                "verifiedYes": "آپ نے مسئلہ حل ہونے کی تصدیق کی۔ شکریہ!",
                "verifiedNo": "آپ نے بتایا کہ مسئلہ حل نہیں ہوا۔ اسے دوبارہ کارروائی کے لیے بھیج دیا گیا ہے۔"
            },
            "reopenModal": {
                "title": "شکایت دوبارہ کھولیں",
                "description": "وجہ بیان کریں تاکہ عملہ درستی کے اقدامات کر سکے۔",
                "feedbackLabel": "دوبارہ کھولنے کی وجہ",
                "feedbackPlaceholder": "مثلاً: لائٹ ٹھیک کی گئی تھی لیکن اگلے ہی دن پھر بند ہو گئی...",
                "submitReopen": "شکایت دوبارہ کھولیں",
                "cancel": "منسوخ کریں"
            }
        },
        "notifications": {
            "tag": "نوٹیفکیشن سینٹر",
            "title": "شہری الرٹس اور اپ ڈیٹس",
            "description": "اپنی شکایات کی تازہ صورتحال اور بلدیاتی اقدامات سے باخبر رہیں۔",
            "emptyTitle": "ابھی کوئی اطلاع نہیں ہے",
            "emptyDescription": "آپ تمام اپ ڈیٹس دیکھ چکے ہیں! نئی اطلاعات یہاں نظر آئیں گی۔",
            "today": "آج",
            "earlier": "پہلے",
            "total": "کل",
            "unread": "ان پڑھا",
            "read": "پڑھا ہوا",
            "unreadBadge": "ان پڑھا",
            "loadError": "اطلاعات لوڈ کرنے میں ناکامی۔"
        },
        "userMenu": {
            "accountMenu": "صارف اکاؤنٹ مینو",
            "signOut": "سائن آؤٹ"
        }
    }
}

SA_DICT = {
    "common": {
        "loading": "लोड भवति...",
        "error": "त्रुटिः",
        "tryAgain": "पुनः प्रयतताम्",
        "back": "प्रतिगच्छतु",
        "cancel": "निरस्यताम्",
        "submit": "समर्पयतु",
        "save": "रक्ष्यताम्",
        "search": "अन्विष्यताम्",
        "reset": "पुनर्स्थापयतु",
        "optional": "ऐच्छिकम्",
        "required": "आवश्यकम्",
        "all": "सर्वम्",
        "viewDetails": "विवरणं पश्यतु",
        "backToDashboard": "फलकं प्रतिगच्छतु",
        "workspace": "CivicFix कार्यक्षेत्रम्",
        "close": "पिदधातु",
        "activeRole": "सक्रियभूमिका",
        "workflowPipeline": "कार्यप्रवाहक्रमावलिः"
    },
    "nav": {
        "dashboard": "मुख्यफलकम्",
        "reportIssue": "समस्यां सूचयतु",
        "myIssues": "मम समस्याः",
        "notifications": "सूचनाः",
        "signOut": "निर्गच्छतु",
        "activeRoleDesc": "{{role}} कार्यार्थं CivicFix कार्यक्षेत्रम्।"
    },
    "languages": LANGUAGES_BLOCK,
    "categories": {
        "Pothole": "मार्गगर्तः",
        "Garbage": "अवकरः",
        "Streetlight": "वीथिदीपः",
        "Water Supply": "जलापूर्तिः",
        "Drainage": "जलनिर्गममार्गः",
        "Road Damage": "मार्गक्षतिः",
        "Traffic/Safety": "यातायातम् / सुरक्षा",
        "Other": "अन्यत्"
    },
    "statuses": {
        "SUBMITTED": "समर्पितम्",
        "AI_ANALYZED": "AI द्वारा विश्लेषितम्",
        "AWAITING_ADMIN_CLASSIFICATION": "वर्गीकरणं प्रतीक्ष्यते",
        "CLASSIFIED_SIMPLE": "सरलवर्गीकृतम्",
        "CLASSIFIED_COMPLEX": "जटिलाह्वानम्",
        "UNDER_REVIEW": "समीक्षणाधीनम्",
        "TRIAGED": "विभाजितम्",
        "ASSIGNED": "नियोजितम्",
        "IN_PROGRESS": "प्रचलति",
        "PARTIALLY_COMPLETED": "आंशिकं सम्पन्नम्",
        "RESOLVED": "समाहितम्",
        "CITIZEN_VERIFIED": "नागरिकप्रमाणितम्",
        "VERIFIED": "प्रमाणितम्",
        "REOPENED": "पुनरुद्घाटितम्",
        "REJECTED": "प्रत्याख्यातम्",
        "ESCALATED_TO_INNOVATION": "अनुसन्धानार्थं प्रेषितम्"
    },
    "priorities": {
        "LOW": "न्यूनम्",
        "MEDIUM": "मध्यमम्",
        "HIGH": "उच्चम्",
        "URGENT": "अत्यावश्यकम्",
        "all": "सर्वाः प्राथमिकताः"
    },
    "departments": {
        "Roads & Infrastructure": "मार्गाः पूर्वाधारश्च",
        "Sanitation & Waste Management": "स्वच्छता अवकरप्रबन्धनञ्च",
        "Electricity & Lighting": "विद्युत् वीथिदीपाश्च",
        "Water Supply & Sewerage": "जलापूर्तिः मलनिस्सारणञ्च",
        "Public Safety & Traffic": "लोकसुरक्षा यातायातञ्च",
        "Health & Environment": "स्वास्थ्यं पर्यावरणञ्च",
        "General Administration": "सामान्यप्रशासनम्"
    },
    "citizen": {
        "dashboard": {
            "tag": "नागरिकसेवाकेन्द्रम्",
            "welcome": "पुनः स्वागतम्, {{name}}",
            "subtitle": "स्वक्षेत्रस्य नागरिकसमस्याः सूचयतु, नगरप्रगतेः निरीक्षणं करोतु तथा च भूमौ समाधानं सत्यापयतु।",
            "reportButton": "समस्यां सूचयतु",
            "viewReportsButton": "मम सूचिकाः पश्यतु",
            "stats": {
                "total": "कुलसमस्याः",
                "totalDesc": "पञ्जीकृताः सर्वाः नागरिकसमस्याः",
                "pending": "प्रतीक्षारताः",
                "pendingDesc": "नगरनिरीक्षणप्रतीक्षायाम्",
                "inProgress": "प्रचलत् कार्यम्",
                "inProgressDesc": "भूमौ कार्यं प्रचलति",
                "resolved": "समाहिताः",
                "resolvedDesc": "सम्पन्नाः सत्यापिताश्च"
            },
            "verificationNotice": {
                "single": "१ समाहितसमस्यायां भवतः स्थलसत्यापनम् आवश्यकम्",
                "multiple": "{{count}} समाहितसमस्यासु भवतः स्थलसत्यापनम् आवश्यकम्",
                "description": "नगरकार्यं सम्पन्नम्। समस्या वास्तवम् समाहिता वा इति निश्चिनोतु।",
                "action": "अधुनैव सत्यापयतु"
            },
            "recentActivity": "नूतनगतिविधिः",
            "latestReports": "नूतनाः नागरिकसूचिकाः",
            "viewAll": "सर्वं पश्यतु ({{count}})",
            "impact": {
                "tag": "सामाजिकप्रभावः",
                "title": "नगरप्रशासनस्य उत्तरदायित्ववर्धनम्",
                "description": "भवतः प्रत्येका समस्या प्रशासनम् उत्तरदायिनं करोति तथा च नगरं स्वच्छं सुरक्षितञ्च स्थापयितुं साहाय्यं करोति।",
                "totalImpact": "भवतः कुलयोगदानम्",
                "reports": "सूचिकाः",
                "registry": "नगरपञ्जिकायां दर्जितम्",
                "resolutionRate": "समाधानदरः",
                "resolvedCount": "{{total}} मध्ये {{resolved}} समाहिताः"
            },
            "empty": {
                "title": "अद्यापि कापि समस्या न दर्जिता",
                "description": "भवता अद्यापि कापि समस्या न सूचिता। स्वक्षेत्रस्य समस्यायाः चित्रं गृहीत्वा प्रथमां सूचिकां समर्पयतु।",
                "primaryAction": "अधुनैव सूचयतु",
                "secondaryAction": "समस्यासूचीं पश्यतु"
            },
            "loadError": "भवतः सूचिकाः उद्घाटयितुम् असमर्थः।"
        },
        "report": {
            "tag": "नागरिकसमस्यानिवेदनम्",
            "title": "नागरिकसमस्यां सूचयतु",
            "description": "पूर्वाधार-स्वच्छता-सुरक्षाविषयिणीं समस्यां सूचयतु। भवतः निवेदनं साक्षात् अधिकारिभ्यः प्रेषयिष्यते।",
            "steps": {
                "step1": "१",
                "step1Title": "समस्यां वर्णयतु",
                "step1Subtitle": "कां समस्यां सूचयति?",
                "step2": "२",
                "step2Title": "स्थानं निर्दिशतु",
                "step2Subtitle": "समस्या कुत्र वर्तते?",
                "step3": "३",
                "step3Title": "चित्रं संलग्नीकरोतु",
                "step3Subtitle": "समस्यायाः चित्रप्रमाणं ददातु",
                "step4": "४",
                "step4Title": "समर्पयितुं सज्जः?",
                "step4Subtitle": "समर्पणात् पूर्वं विवरणं परीक्षताम्।"
            },
            "fields": {
                "titleLabel": "समस्यायाः शीर्षकम्",
                "titlePlaceholder": "यथा: भग्नः वीथिदीपः, अवकरराशिः, मार्गे गभीरः गर्तः",
                "categoryLabel": "वर्गः",
                "categorySelect": "वर्गं चिनोतु",
                "descriptionLabel": "विस्तृतविवरणम्",
                "descriptionPlaceholder": "समस्यायाः पूर्णं विवरणं ददातु: यथार्थस्थानम्, सङ्कटः, कियत्कालात् अस्ति...",
                "locationLabel": "स्थानम् अभिज्ञानचिह्नञ्च",
                "locationPlaceholder": "यथा: मेट्रो स्तम्भ १४२ समीपे, जुबिली हिल्स मार्ग संख्या ३६",
                "gpsTitle": "GPS स्थितिः",
                "gpsDescription": "स्थाननिर्देशाङ्कसंलग्नीकरणेन कर्मकराः शीघ्रं स्थानं प्राप्तुं शक्नुवन्ति।",
                "gpsButton": "मम वर्तमानस्थानम् उपयुज्यताम्",
                "gpsDetecting": "GPS अन्विष्यते...",
                "gpsCaptured": "स्थानं प्राप्तम्: {{lat}}, {{lng}}",
                "gpsAccuracy": " (±{{accuracy}}मी)",
                "photoUploadTitle": "चित्रं ग्रहीतुं वा चेतुं वा क्लिक् करोतु",
                "photoUploadDesc": "JPG, PNG, HEIC, WebP समर्थितम्। समर्पणात् पूर्वं चित्राणि स्वयमेव संकुचितानि भवन्ति।",
                "selectFile": "सञ्चिकां चिनोतु",
                "processingFile": "प्रक्रिया प्रचलति...",
                "removePhoto": "निष्कासयतु"
            },
            "voice": {
                "speakButton": "वाण्या वर्णयतु",
                "listening": "शृणोति... अधुना वदतु",
                "stop": "स्थगयतु",
                "transcribing": "AI द्वारा पाठ्यरूपान्तरणं प्रचलति...",
                "detectedLanguage": "{{language}} भाषायां प्रत्यभिज्ञातम्",
                "replaceOrAppend": "पाठ्यं सज्जम्। अधः परीक्षताम् अथवा संशोध्यताम्।",
                "micPermissionDenied": "ध्वनिग्राहकानुमतिः न प्राप्ता। जालगवाक्षस्य व्यवस्थायां स्वीकरोतु।",
                "micNotSupported": "अस्मिन् जालगवाक्षे ध्वन्यङ्कनं न समर्थितम्।",
                "transcriptionFailed": "ध्वनिरूपान्तरणं विफलम्। पुनः प्रयतताम् अथवा टङ्कनं करोतु।",
                "reviewTitle": "ध्वनिपाठ्यसमीक्षा",
                "originalTextLabel": "मूलकथितपाठ्यम्",
                "englishTranslationLabel": "आङ्ग्लानुवादः",
                "useTranscription": "इदं पाठ्यम् उपयुज्यताम्",
                "recordAgain": "पुनः ध्वन्यङ्कनं करोतु",
                "discard": "त्यजतु"
            },
            "stages": {
                "idle": "समर्पयितुं सज्जम्",
                "saving": "समस्या पञ्जीक्रियते...",
                "uploading": "चित्रम् आरोप्यते...",
                "finalizing": "निवेदनम् अन्तिमीक्रियते..."
            },
            "submitButton": "नागरिकसूचिकां समर्पयतु",
            "successModal": {
                "tag": "समस्या सफ़लतया दर्जिता",
                "title": "भवतः नागरिकसमस्या दर्जिता!",
                "refText": "CivicFix भवतः समस्यां पञ्जीकृत्य सन्दर्भसङ्ख्यां प्रदत्तवती",
                "summary": "सूचिकासङ्क्षेपः",
                "titleField": "शीर्षकम्",
                "categoryField": "वर्गः",
                "statusField": "स्थितिः",
                "submittedAtField": "समर्पणसमयः",
                "viewIssue": "मम समस्यां पश्यतु",
                "backToDashboard": "फलकं प्रतिगच्छतु"
            },
            "partialErrorModal": {
                "tag": "सूचनया सह रक्षिता",
                "title": "भवतः सूचिका निर्मिता",
                "description": "समस्या दत्तांशकोषे दर्जिता, किन्तु चित्रारोपणं पूर्णं न जातम्।",
                "viewIssues": "मम समस्याः पश्यतु",
                "backToDashboard": "फलकं प्रतिगच्छतु"
            },
            "validation": {
                "title": "कृपया समस्यायाः शीर्षकं ददातु।",
                "description": "कृपया समस्यायाः विवरणं ददातु।",
                "category": "कृपया वर्गं चिनोतु।",
                "location": "कृपया स्थानम् अभिज्ञानचिह्नं वा लिखतु।",
                "image": "कृपया एकं JPG, PNG, HEIC वा WebP चित्रं चिनोतु।"
            }
        },
        "issues": {
            "tag": "समस्यापञ्जिका",
            "title": "मम नागरिकसमस्याः",
            "description": "स्वशहरे दर्जितां प्रत्येकां समस्याम् अन्विष्यतु, शोधयतु तथा च निरीक्षताम्।",
            "reportButton": "समस्यां सूचयतु",
            "searchPlaceholder": "शीर्षकेण, स्थानेन, वर्गेन, विवरणेन अन्विष्यताम्...",
            "sortNewest": "नूतनं प्रथमम्",
            "sortOldest": "पुरातनं प्रथमम्",
            "filtersSort": "शोधकाः क्रमाङ्कनञ्च",
            "resetFilters": "पुनर्स्थापयतु",
            "showingCount": "{{total}} मध्ये {{filtered}} समस्याः दृश्यन्ते",
            "sortedBy": "क्रमः: {{order}}",
            "empty": {
                "noReports": "कापि समस्या न लब्धा",
                "noReportsDesc": "भवता अद्यापि कापि समस्या न दर्जिता। प्रथमां CivicFix सूचिकां निर्माय प्रारभताम्।",
                "noMatches": "समानानुरूपा समस्या नास्ति",
                "noMatchesDesc": "वर्तमानशोधनेन सह कापि समस्या न युज्यते। शोधकं परिवर्तयतु।"
            },
            "filterLabels": {
                "all": "सर्वम्",
                "pending": "प्रतीक्ष्यमाणम्",
                "verified": "प्रमाणितम्",
                "inProgress": "प्रचलति",
                "resolved": "समाहितम्",
                "reopened": "पुनरुद्घाटितम्",
                "rejected": "प्रत्याख्यातम्"
            }
        },
        "issueDetails": {
            "backToReports": "मम सूचिकाः प्रतिगच्छतु",
            "reportedOn": "{{date}} दिनाङ्के सूचितम्",
            "reference": "सन्दर्भः #{{id}}",
            "descriptionSection": "समस्याविवरणम्",
            "locationSection": "स्थानसूचना",
            "landmark": "अभिज्ञानचिह्नम् / सङ्केतः",
            "coordinates": "GPS निर्देशाङ्काः",
            "openMap": "मानचित्रे उद्घाटयतु",
            "photoSection": "चित्रप्रमाणम्",
            "initialPhoto": "नागरिकदत्तं चित्रम्",
            "resolutionPhoto": "समाधानप्रमाणचित्रम्",
            "timelineSection": "प्रगतिः इतिहासश्च",
            "deptAssignment": "नियोजितविभागः",
            "originalLanguage": "मूलभाषा",
            "inputMethod": "समर्पणमाध्यमम्",
            "voiceInput": "ध्वन्यङ्कनम्",
            "textInput": "लिखितपाठ्यम्",
            "viewEnglish": "आङ्ग्लानुवादं पश्यतु",
            "viewOriginal": "मूलं पश्यतु ({{lang}})",
            "canonicalNotice": "इयं सूचिका {{lang}} भाषायां दर्जिता तथा च नगरप्रशासनकार्यार्थम् आङ्ग्लभाषायाम् अनुवादिता।",
            "verificationCard": {
                "title": "स्थलसत्यापनम् आवश्यकम्",
                "description": "नगरदलेन इयं समस्या समाहिता इति चिह्निता। भूमौ समस्या वास्तवम् समाहिता किम्?",
                "yesButton": "आम्, समस्या समाहिता",
                "noButton": "न, अद्यापि समस्या वर्तते (पुनरुद्घाटयतु)",
                "verifiedYes": "भवता समाधानं सत्यापितम्। धन्यवादाः!",
                "verifiedNo": "भवता सूचितं यत् समस्या न समाहिता। इयं पुनः परीक्षायै प्रेषिता।"
            },
            "reopenModal": {
                "title": "समस्यां पुनरुद्घाटयतु",
                "description": "कर्मकराणां संशोधनात्मककार्याय कारणं वर्णयतु।",
                "feedbackLabel": "पुनरुद्घाटनस्य कारणम्",
                "feedbackPlaceholder": "यथा: दीपः संशोधितः किन्तु परेद्यवि पुनः निर्वापितः...",
                "submitReopen": "समस्यां पुनरुद्घाटयतु",
                "cancel": "निरस्यताम्"
            }
        },
        "notifications": {
            "tag": "सूचनाकेन्द्रम्",
            "title": "नागरिकसचेतनानि नवीकरणानि च",
            "description": "स्वसमस्यानां स्थितेः नगरकार्यस्य च विषये अवगताः भवन्तु।",
            "emptyTitle": "अद्यापि कापि सूचना नास्ति",
            "emptyDescription": "भवन्तः सर्वाः सूचनाः दृष्टवन्तः! नूतनसूचनाः अत्र द्रक्ष्यन्ते।",
            "today": "अद्य",
            "earlier": "पूर्वे",
            "total": "कुलम्",
            "unread": "अपठितम्",
            "read": "पठितम्",
            "unreadBadge": "अपठितम्",
            "loadError": "सूचनाः उद्घाटयितुम् असमर्थः।"
        },
        "userMenu": {
            "accountMenu": "उपयोक्तृखातासूची",
            "signOut": "निर्गच्छतु"
        }
    }
}
