// Exact user-authorized operational wording; no generated dynamic values.
export default [
  {
    "id": "opening",
    "text": "Hej, det er Isabella fra aPureBase. Jeg ringer ganske kort vedrørende faglig information til sundhedspersoner.",
    "english": "Hello, this is Isabella from aPureBase. I am calling briefly about professional information for healthcare professionals.",
    "textHash": "7374e7e34df81c8cec5f8c4fb0d15e7b48159a7f77a5892f7303ec167e9430c3",
    "wordingVersion": "stage-2.0c1-approved-1",
    "businessAuthorization": "USER_SUPPLIED_STAGE_2_0C_1",
    "dynamicValues": [],
    "consentCritical": false,
    "recipientTypes": []
  },
  {
    "id": "purpose",
    "text": "Vi sender relevant faglig information om blandt andet sygdomsområder, produkter og medicinske opdateringer.",
    "english": "We send relevant professional information including disease areas, products and medical updates.",
    "textHash": "e9013110ccd2dc639b7d638cd38563b65b4a5bf4a4ed41086072890e88c96e15",
    "wordingVersion": "stage-2.0c1-approved-1",
    "businessAuthorization": "USER_SUPPLIED_STAGE_2_0C_1",
    "dynamicValues": [],
    "consentCritical": false,
    "recipientTypes": []
  },
  {
    "id": "consent-question",
    "text": "Må aPureBase sende relevant faglig information til dig via e-mail?",
    "english": "May aPureBase send relevant professional information to you by email?",
    "textHash": "50d04c73e833ffaff11406beb5ecf32c271c9d2b4e2265c89d27cd5d2b6723d8",
    "wordingVersion": "stage-2.0c1-approved-1",
    "businessAuthorization": "USER_SUPPLIED_STAGE_2_0C_1",
    "dynamicValues": [],
    "consentCritical": true,
    "recipientTypes": [
      "TARGET_HCP"
    ]
  },
  {
    "id": "email-request",
    "text": "Tak. Hvilken e-mailadresse må vi sende informationen til?",
    "english": "Thank you. Which email address may we send the information to?",
    "textHash": "c76f6b07f9ee7c4fee1498fcd350d0a0ff9d62449736e163af3a4de83d1398a6",
    "wordingVersion": "stage-2.0c1-approved-1",
    "businessAuthorization": "USER_SUPPLIED_STAGE_2_0C_1",
    "dynamicValues": [],
    "consentCritical": false,
    "recipientTypes": []
  },
  {
    "id": "email-readback-intro",
    "text": "Jeg gentager lige e-mailadressen for at være sikker.",
    "english": "I will repeat the email address to be sure.",
    "textHash": "7033d48f0f96673a5bc8641da796b6e3aa3a3dae033898ac96eb83c6dd15b627",
    "wordingVersion": "stage-2.0c1-approved-1",
    "businessAuthorization": "USER_SUPPLIED_STAGE_2_0C_1",
    "dynamicValues": [],
    "consentCritical": false,
    "recipientTypes": []
  },
  {
    "id": "email-confirmation-question",
    "text": "Er det korrekt?",
    "english": "Is that correct?",
    "textHash": "fda15e3a15daadaa533203ff8ca9f777578aa2ec75056d44298065d73948a03f",
    "wordingVersion": "stage-2.0c1-approved-1",
    "businessAuthorization": "USER_SUPPLIED_STAGE_2_0C_1",
    "dynamicValues": [],
    "consentCritical": false,
    "recipientTypes": []
  },
  {
    "id": "success-close",
    "text": "Perfekt, mange tak for din tid. Du kan altid framelde dig igen. Hav en god dag.",
    "english": "Perfect, thank you for your time. You can always unsubscribe. Have a good day.",
    "textHash": "73d1b08bcda88782c346088d8f1675df6404378d84505c431dedcc07bc166e49",
    "wordingVersion": "stage-2.0c1-approved-1",
    "businessAuthorization": "USER_SUPPLIED_STAGE_2_0C_1",
    "dynamicValues": [],
    "consentCritical": false,
    "recipientTypes": []
  },
  {
    "id": "refusal-close",
    "text": "Det er helt i orden. Tak for din tid, og hav en god dag.",
    "english": "That is quite alright. Thank you for your time and have a good day.",
    "textHash": "b5cb3098fef60f1cbd4563cf14808c3cd3085ce730c08eb01a459a2dfb1f0acd",
    "wordingVersion": "stage-2.0c1-approved-1",
    "businessAuthorization": "USER_SUPPLIED_STAGE_2_0C_1",
    "dynamicValues": [],
    "consentCritical": false,
    "recipientTypes": []
  },
  {
    "id": "receptionist-target-request",
    "text": "Jeg ringer vedrørende faglig information til [NAVN]. Kan jeg tale med vedkommende?",
    "english": "I am calling about professional information for [NAME]. May I speak with them?",
    "textHash": "ced80619a57c4780b7f7773ba049ba6172591e35346e9667d97cf14c86f3cd0a",
    "wordingVersion": "stage-2.0c1-approved-1",
    "businessAuthorization": "USER_SUPPLIED_STAGE_2_0C_1",
    "dynamicValues": [
      "NAME"
    ],
    "consentCritical": false,
    "recipientTypes": []
  },
  {
    "id": "authority-ask",
    "text": "Må jeg lige bekræfte, at du er bemyndiget til at håndtere dette på vegne af [NAVN]?",
    "english": "May I confirm you are authorized to handle this on behalf of [NAME]?",
    "textHash": "622d1159959b850e21fd1ab57959ae16e591e6ff6d8d575f3cfe7134cd6c8ce7",
    "wordingVersion": "stage-2.0c1-approved-1",
    "businessAuthorization": "USER_SUPPLIED_STAGE_2_0C_1",
    "dynamicValues": [
      "NAME"
    ],
    "consentCritical": false,
    "recipientTypes": []
  },
  {
    "id": "intermediary-consent-question",
    "text": "Tak. Må aPureBase sende relevant faglig information via e-mail til [NAVN]?",
    "english": "Thank you. May aPureBase send relevant professional information by email to [NAME]?",
    "textHash": "3db29af81fbba5f83f4d002c095b2d9f7e9d72ee40de1114e8d8bbd1135391b1",
    "wordingVersion": "stage-2.0c1-approved-1",
    "businessAuthorization": "USER_SUPPLIED_STAGE_2_0C_1",
    "dynamicValues": [
      "NAME"
    ],
    "consentCritical": true,
    "recipientTypes": [
      "INTERMEDIARY"
    ]
  },
  {
    "id": "identity",
    "text": "Jeg hedder Isabella og ringer fra aPureBase.",
    "english": "My name is Isabella and I am calling from aPureBase.",
    "textHash": "d04f62b9ad9d76d4724b0a90bb24b39aa8fe7ec97be81f24abbf357d4c2acb11",
    "wordingVersion": "stage-2.0c1-approved-1",
    "businessAuthorization": "USER_SUPPLIED_STAGE_2_0C_1",
    "dynamicValues": [],
    "consentCritical": false,
    "recipientTypes": []
  },
  {
    "id": "about-apurebase",
    "text": "aPureBase formidler relevant faglig information til sundhedspersoner.",
    "english": "aPureBase provides relevant professional information to healthcare professionals.",
    "textHash": "6ada746b87baba47d28edf1b40ce48e0a6e3cc0b9ee6f1ca3f2f5042642804b6",
    "wordingVersion": "stage-2.0c1-approved-1",
    "businessAuthorization": "USER_SUPPLIED_STAGE_2_0C_1",
    "dynamicValues": [],
    "consentCritical": false,
    "recipientTypes": []
  },
  {
    "id": "explanation",
    "text": "Det kan blandt andet være information om sygdomsområder, produkter og medicinske opdateringer.",
    "english": "It can include information about disease areas, products and medical updates.",
    "textHash": "4d4bd86e384a4a918b1852c49827a6e9b9122d096d83b2b9fe385124546a088a",
    "wordingVersion": "stage-2.0c1-approved-1",
    "businessAuthorization": "USER_SUPPLIED_STAGE_2_0C_1",
    "dynamicValues": [],
    "consentCritical": false,
    "recipientTypes": []
  },
  {
    "id": "why-calling",
    "text": "Jeg ringer kun for at spørge, om aPureBase må sende dig relevant faglig information via e-mail.",
    "english": "I am only calling to ask whether aPureBase may send you relevant professional information by email.",
    "textHash": "2a1e8e2bf80cc6ef9d9eddf3d14c6683ef8e89da244ff4be0ceb65a590c06f6f",
    "wordingVersion": "stage-2.0c1-approved-1",
    "businessAuthorization": "USER_SUPPLIED_STAGE_2_0C_1",
    "dynamicValues": [],
    "consentCritical": false,
    "recipientTypes": []
  },
  {
    "id": "unsubscribe",
    "text": "Ja. Du kan altid framelde dig igen, hvis du ikke længere ønsker at modtage informationen.",
    "english": "Yes. You can always unsubscribe if you no longer wish to receive the information.",
    "textHash": "e95d7a401fa4856920ed7602799c144527a8065e4d32506a5f142dcd783ccf4a",
    "wordingVersion": "stage-2.0c1-approved-1",
    "businessAuthorization": "USER_SUPPLIED_STAGE_2_0C_1",
    "dynamicValues": [],
    "consentCritical": false,
    "recipientTypes": []
  },
  {
    "id": "repeat-prefix",
    "text": "Selvfølgelig. Jeg gentager lige spørgsmålet.",
    "english": "Of course. I will repeat the question.",
    "textHash": "124f126bad7b7cfaa5cebab84b515e6ff9612e835baec291715e393622105290",
    "wordingVersion": "stage-2.0c1-approved-1",
    "businessAuthorization": "USER_SUPPLIED_STAGE_2_0C_1",
    "dynamicValues": [],
    "consentCritical": false,
    "recipientTypes": []
  },
  {
    "id": "clarify",
    "text": "Selvfølgelig. Må aPureBase sende relevant faglig information til dig via e-mail?",
    "english": "Of course. May aPureBase send relevant professional information to you by email?",
    "textHash": "2e4ca4046577fdf070b6bca20e067e3bd3538371dc5c010f51aa9b0aa75e6051",
    "wordingVersion": "stage-2.0c1-approved-1",
    "businessAuthorization": "USER_SUPPLIED_STAGE_2_0C_1",
    "dynamicValues": [],
    "consentCritical": true,
    "recipientTypes": [
      "TARGET_HCP"
    ]
  },
  {
    "id": "callback",
    "text": "Det forstår jeg. Hvornår vil det passe bedre, at vi ringer igen?",
    "english": "I understand. When would it be better for us to call again?",
    "textHash": "855be49b2eadf2f805adbaa329758ef8952f7c1b0ac4193638356ed3b7dbdad6",
    "wordingVersion": "stage-2.0c1-approved-1",
    "businessAuthorization": "USER_SUPPLIED_STAGE_2_0C_1",
    "dynamicValues": [],
    "consentCritical": false,
    "recipientTypes": []
  },
  {
    "id": "callback-close",
    "text": "Selvfølgelig. Vi ringer igen på et senere tidspunkt. Tak for din tid.",
    "english": "Of course. We will call again later. Thank you for your time.",
    "textHash": "1ad580fbd61e302a5d227d85e002cb01a09ab391a868895b33f38ab51a7cb3f4",
    "wordingVersion": "stage-2.0c1-approved-1",
    "businessAuthorization": "USER_SUPPLIED_STAGE_2_0C_1",
    "dynamicValues": [],
    "consentCritical": false,
    "recipientTypes": []
  },
  {
    "id": "wrong-person-close",
    "text": "Beklager. Kan du hjælpe mig med at komme i kontakt med [NAVN]?",
    "english": "Sorry. Can you help me get in contact with [NAME]?",
    "textHash": "b44fbffef0b57525a0d215f59cc6abf1aabbc96bfe4f9d0d6247f8f56d194aa0",
    "wordingVersion": "stage-2.0c1-approved-1",
    "businessAuthorization": "USER_SUPPLIED_STAGE_2_0C_1",
    "dynamicValues": [
      "NAME"
    ],
    "consentCritical": false,
    "recipientTypes": []
  },
  {
    "id": "target-unavailable",
    "text": "Det er helt i orden. Hvornår vil det være bedst at ringe igen?",
    "english": "That is quite alright. When would it be best to call again?",
    "textHash": "43344c5931f5e4f099c9825bbddf0cdcc413fb8f3b8cd8f0dbd8c05661b78405",
    "wordingVersion": "stage-2.0c1-approved-1",
    "businessAuthorization": "USER_SUPPLIED_STAGE_2_0C_1",
    "dynamicValues": [],
    "consentCritical": false,
    "recipientTypes": []
  },
  {
    "id": "send-first",
    "text": "Vi skal først have din tilladelse, før vi sender informationen via e-mail.",
    "english": "We first need your permission before sending the information by email.",
    "textHash": "d80002cdbaa1e5dbdb20258f1b5e298a23bd3f95bec867d23b434a73b7de94e1",
    "wordingVersion": "stage-2.0c1-approved-1",
    "businessAuthorization": "USER_SUPPLIED_STAGE_2_0C_1",
    "dynamicValues": [],
    "consentCritical": false,
    "recipientTypes": []
  },
  {
    "id": "uncertain-consent",
    "text": "Det er helt i orden. Jeg skal bare have et tydeligt ja eller nej. Må aPureBase sende relevant faglig information til dig via e-mail?",
    "english": "That is alright. I just need a clear yes or no. May aPureBase send relevant professional information to you by email?",
    "textHash": "15a7f3253fe183406bc8142ef366ac8c1a43f45defe0095a617994ae3257146c",
    "wordingVersion": "stage-2.0c1-approved-1",
    "businessAuthorization": "USER_SUPPLIED_STAGE_2_0C_1",
    "dynamicValues": [],
    "consentCritical": true,
    "recipientTypes": [
      "TARGET_HCP"
    ]
  },
  {
    "id": "already-receiving",
    "text": "Tak. Jeg skal stadig bekræfte din tilladelse. Må aPureBase fortsat sende relevant faglig information til dig via e-mail?",
    "english": "Thank you. I still need to confirm your permission. May aPureBase continue sending relevant professional information to you by email?",
    "textHash": "7de595c630389b264bb01b0477fe989a0c8332eae66af4b5dd15252f8e91e7d2",
    "wordingVersion": "stage-2.0c1-approved-1",
    "businessAuthorization": "USER_SUPPLIED_STAGE_2_0C_1",
    "dynamicValues": [],
    "consentCritical": true,
    "recipientTypes": [
      "TARGET_HCP"
    ]
  },
  {
    "id": "email-correction-prefix",
    "text": "Tak. Jeg retter den. Jeg gentager den nye e-mailadresse.",
    "english": "Thank you. I will correct it and repeat the new email address.",
    "textHash": "5967884e0df2ae2350b7274c2242c532df13838d087445924e69204cb2fd5f70",
    "wordingVersion": "stage-2.0c1-approved-1",
    "businessAuthorization": "USER_SUPPLIED_STAGE_2_0C_1",
    "dynamicValues": [],
    "consentCritical": false,
    "recipientTypes": []
  },
  {
    "id": "email-correction-confirm",
    "text": "Er det korrekt?",
    "english": "Is that correct?",
    "textHash": "fda15e3a15daadaa533203ff8ca9f777578aa2ec75056d44298065d73948a03f",
    "wordingVersion": "stage-2.0c1-approved-1",
    "businessAuthorization": "USER_SUPPLIED_STAGE_2_0C_1",
    "dynamicValues": [],
    "consentCritical": false,
    "recipientTypes": []
  },
  {
    "id": "more-explanation",
    "text": "aPureBase sender faglig information, som kan være relevant for dit arbejde som sundhedsperson. Det er frivilligt, og du kan altid framelde dig igen.",
    "english": "aPureBase sends professional information that may be relevant to your work. It is voluntary and you can always unsubscribe.",
    "textHash": "93a08f778971d815c4fa2c354eb35ea14e07eb8377d73354ef62199b93502a8f",
    "wordingVersion": "stage-2.0c1-approved-1",
    "businessAuthorization": "USER_SUPPLIED_STAGE_2_0C_1",
    "dynamicValues": [],
    "consentCritical": false,
    "recipientTypes": []
  },
  {
    "id": "stop-contact-close",
    "text": "Det forstår jeg. Tak for din tid, og hav en god dag.",
    "english": "I understand. Thank you for your time and have a good day.",
    "textHash": "01044caa100080167e93c67441edb46fd399f232a008844185dd8f7c51570f25",
    "wordingVersion": "stage-2.0c1-approved-1",
    "businessAuthorization": "USER_SUPPLIED_STAGE_2_0C_1",
    "dynamicValues": [],
    "consentCritical": false,
    "recipientTypes": []
  },
  {
    "id": "thank-you",
    "text": "Perfekt, tak.",
    "english": "Perfect, thank you.",
    "textHash": "ea686b035128b54fc70ea7d357bfa40acc0a3320b101f030634db9920bcbd2a7",
    "wordingVersion": "stage-2.0c1-approved-1",
    "businessAuthorization": "USER_SUPPLIED_STAGE_2_0C_1",
    "dynamicValues": [],
    "consentCritical": false,
    "recipientTypes": []
  }
];
