# Stage 2.0C-3.1 — Asems menneskelige retest

**C-3 og C-3.1 er NOT ACCEPTED. Ingen telefoni, deployment eller produktion.**
Denne vejledning gælder den nye, ikke-committede C-3.1-arbejdskopi. Den gamle PR/commit `a5b70549484e560351dcb2f8e2513c26ac9b2eaf` indeholder ikke disse rettelser alene. Humza skal overdrage hele den kontrollerede arbejdskopi med de 12 nye WAV-filer; ingen offentlig push er udført i denne omgang.

## Før du begynder

Brug en computer med Node ≥22.12, Chrome og et fysisk headset/mikrofon. Den kontrollerede udviklingsmaskine bruger Node 25.9.0 / npm 11.12.1. `127.0.0.1` er altid din egen computer; linket på Humzas maskine starter ikke en app på din.

Humza/den tekniske hjælper forbereder projektmappen én gang:

1. Åbn terminalen i projektets rodmappe, og kør `npm ci` ved en ny kopi.
2. Opret en lokal, ignoreret fil `.env.c31`. Få en godkendt OpenAI-nøgle via sikker kanal; send eller commit aldrig filen. Der kræves ingen ElevenLabs-nøgle til denne lytte-/ASR-retest.

```dotenv
OPENAI_API_KEY=<godkendt nøgle, kun lokalt>
OPENAI_TRANSCRIPTION_MODE=realtime
OPENAI_LIVE_TRANSCRIBE_MODEL=gpt-live-transcribe
OPENAI_TRANSCRIBE_DELAY=low
AGENT_SILENCE_MS=450
CLINIC_SILENCE_MS=1350
```

3. Kontrollér hele kopien uden providerbrug:

```bash
node --import tsx scripts/verify-stage20c31.ts
```

Forvent PASS: alle oprindelige 37 optagelser, 12 nye optagelser, 24 bevarede aktuelle godkendelser, 13 nødvendige reviews. Ved hash-/filfejl: stop og kontakt Humza; ingen regenerering eller redigering af hashes.

4. Stop kun din egen gamle server på port 5173 med Ctrl+C. Start derefter **én** server, og lad terminalen stå åben:

```bash
DOTENV_CONFIG_PATH=.env.c31 node --import tsx server/consentRetest.ts
```

Ingen separat server på 5180, Vite alene, generator, benchmark eller stresstest. Åbn:

**http://127.0.0.1:5173/consent-call?stage=2.0c31**

Frontend, original ASR-gateway og begge generationers cachede lyd kører på samme lokale server. `/api/c31/health` skal vise JSON med `stage: "2.0c31"`, `gateway: true` og `configured: true`. Configured betyder kun, at en nøgle findes; det beviser ikke adgang til provideren. Serverstart/health/lytning starter ingen providerrequest. Mikrofonens Start bruger OpenAI-credits. Ingen kildeaudio gemmes; transcript, tider og reviews er testdata.

## Trin 1 — mikrofon og dansk ASR

1. Brug hovedtelefoner, luk andre mikrofonprogrammer, og udfyld **Reviewer / tester** med dit navn.
2. Tryk **Kontrollér backend (ingen providerrequest)**. Ved fejl: gem skærmbillede/eksport og kontrollér `.env.c31`, nøgleadgang, port og server. Del aldrig nøglen.
3. Sæt headset-krydset. Vælg ét **Testudsagn**; tryk **Start mikrofon + dansk ASR**, og tillad mikrofon i browser/OS.
4. Vent på virkelig forbindelse/capture. Sig udsagnet naturligt. Vent på den bogstavelige final; tryk **Stop smoke-mikrofon**. Kræv ikke kunstigt lange pauser. Kort naturlig slutpause skal lade den eksisterende endpointing afslutte et turn.
5. Sammenlign det faktisk sagte med **literal ASR**. Notér udeladelser/ændringer; ret aldrig teksten. Tryk den navngivne PASS-knap kun, hvis du har kontrolleret resultatet; ellers FAIL. Der skal stå source=MICROPHONE, session READY og et rigtigt `mic:` turn. Intet manuelt input kan åbne låsen.
6. Gentag separat for alle fem: **Ja**, **Nej**, **Det er mig**, **Send det til min e-mail**, **Jeg vil gerne vide mere**. Ordene er tests, aldrig samtykke; de sendes ikke som recognition-hints.

A–R åbner først efter mindst én ægte, menneskeligt vurderet providerfinal og alle nødvendige lyttereviews. Alle fem smokes kræves til den samlede menneskelige acceptgennemgang. Hvis ASR fejler, forbliver låsen lukket; eksporter fejl og diagnose, og stop før A–R. Historiske preflight-events eksporteres, men en reload kan ikke genbruge den gamle gate som ny aktuel forbindelse.

## Trin 2–4 — kun nødvendige optagelser

Der er **13** obligatoriske lyttereviews:

- Trin 2: seks nye statiske klip (`consent-question`, `refusal-close`, `explanation`, `why-calling`, `unsubscribe`, `stop-contact-close`) samt det gamle, aldrig vurderede `about-apurebase`.
- Trin 3: fire nye email-readbacks: `anna@clinic.dk`, `anna2.test-7@clinic.dk`, `anna3.test-7@clinic.dk`, `a_b+2@x.dk`.
- Trin 4: to ændrede `receptionist-target-request` for Jens Hansen og Anna Jensen.

De øvrige **24 aktuelle klip** står **UNCHANGED — PREVIOUS HUMAN APPROVAL RETAINED** og kræver ingen gentagen godkendelse. Alle oprindelige filer/godkendelser bevares historisk, også den tidligere godkendte consent-question og `a_b+2@x.dk`, som nu er erstattet.

For hvert nødvendigt klip: klik **Play / Replay**, lyt helt, skriv **Comment**, sæt den fysiske lyttecheckbox og vælg **Approve** eller **Reject**. Ved Reject skal der være en konkret kommentar. Ved tvivl: lad NOT_REVIEWED stå, og skriv problemet. Playback completion er teknisk evidens, aldrig menneskelig godkendelse. Softwaren eller Humza må ikke godkende på dine vegne.

Kontrollér især:

- Siger den tydeligt **aPureBase**? Den skriftlige/juridiske identitet er uændret; den talte kandidat er `a Pure Base` og kræver din vurdering.
- Er afslutninger, “sige fra”, forklaring og “Jeg …” flydende/naturlige?
- Er den kønsneutrale transferanmodning passende og navnene korrekte?
- Kan du rekonstruere den præcise email fra staveordene, alle tegn og tal? N staves med ordet **Niels**, ikke kun et nyt N-lydtrick. Hele staveordskortet findes på siden.
- Email-readback er længere (ca. 10,9–19,3 sek.) og skal vurderes for forståelighed og samtalens naturlighed. Bogstavstore/små bevares; ingen uppercase-fixture er fysisk optaget/vurderet i denne pakke. Ukendte værdier skal stoppe på cachemiss, aldrig generere lyd.

Success-close er bevaret med tidligere godkendelse. Noten om HOW man framelder sig er stadig **UNSUBSCRIBE_METHOD_BUSINESS_CONFIRMATION_REQUIRED**. Der er ikke opfundet en kanal. Notér business-tvivl; en lydgodkendelse løser ikke den.

## Trin 5 — faktiske A–R-samtaler

Udfyld også **Reviewer name** i det nederste arbejdsområde. Det er operatørnavnet til facets/scenarier; **Operator evidence / consent review reason** er den konkrete begrundelse inde i et aktivt forsøg.

For hvert forsøg:

1. Vælg scenario og **Start / archive previous rehearsal**. Bevar alle forsøg/call-ID'er.
2. Sæt headset-krydset; klik **Start microphone + Danish ASR (provider usage)**. Kontrollér capture, recognition.started og providerfinals. START REQUESTED/checkbox alene er ikke bevis.
3. Klik **Play / Approve next action**; lad opening slutte. Operatøren verificerer separat målperson eller intermediary med konkret begrundelse. “Det er mig” alene er ikke identitetsbevis.
4. Ved navn: bind den syntetiske Anna Jensen-kontakt til aktuel recipientrevision. Ved rolle-/authorityændring kræves ny binding. Brug ingen patientdata.
5. Fortsæt den anbefalede handling. Lad hele samtykkespørgsmålet slutte før svar, bortset fra bevidst interruption i M/N. Et JA kræver faktisk ejet final og separat **Review YES**; partials, okay/tak/tavshed er aldrig samtykke.
6. Sig email naturligt. Hvis ASR ikke producerer den literal adresse, må du ikke rette transcript for at bestå. Registrér fejlen og sikker takeover. **Approve exact normalization** kræver sammenligning/begrundelse og må ikke opfinde tegn/domæne.
7. Hele readback + **Er det korrekt?** skal slutte. Sig så en frisk bekræftelse, og klik **Approve owned email confirmation**. Korrektion kræver nyt readback og nyt ejet svar; gammelt JA må ikke genbruges.
8. **End rehearsal**, terminal tilstand eller takeover stopper forsøget. **Stop microphone + takeover** er en sikkerheds-/failuretest og afslutter kontinuiteten. Start et nyt forsøg i stedet for at genoptage et gammelt owner.

| ID | Testeren siger/gør | Applikationen skal gøre; vurdering |
|---|---|---|
| A | Direkte læge. Efter fuldt spørgsmål: fx “Ja”, “Ja tak” eller “Ja, det må I gerne”. Sig `anna@clinic.dk` naturligt og bekræft hele readback. | Kun ejet, endeligt JA efter slutning + separat review giver email-request. END_SUCCESS først efter korrekt ny e-mailbekræftelse og afsluttet close. |
| B | Efter fuldt spørgsmål: “Nej tak”; prøv også en naturlig afvisning i et nyt forsøg. Review NO, godkend close. | Ingen e-mail, ingen ny overtalelse; sikker afvisningsafslutning. Ukendt afvisningsform må ikke blive JA. |
| C | Spørg “Hvorfor ringer I?” eller en naturlig tilsvarende formulering. | Afspil kun godkendt forklaring eller takeover ved ukendt form. Forklaring er ikke samtykkespørgsmålet; nyt fuldt spørgsmål kræves før JA. |
| D | Spørg “Hvilken information?” / “Hvad er det for information?” | Relevant eksisterende forklaring; dernæst nyt helt spørgsmål. Ingen frie medicinske/produktpåstande. |
| E | Sig “Måske”, “Det ved jeg ikke”, “Okay” eller tøv naturligt; prøv også tavshed. | Intet samtykke af uklar tale/tavshed. Afklaring eller takeover. Et senere JA kræver en frisk, afsluttet og ejet spørgeinstans. |
| F | Bed fx “Kan du gentage spørgsmålet?” / “Gentag venligst”. Brug operatørknappen **Approve fresh full consent question / repeat** når sikker retry er mulig. | En helt ny spørgeafspilning med nyt playback-ID; gammelt/delayed JA må ikke tilknyttes den. Først et nyt svar efter slutning kan vurderes. |
| G | Sig “Jeg modtager allerede informationen” eller naturlig variant. | Ingen antagelse om eksisterende tilladelse; den godkendte allerede-modtager-form eller takeover, med nyt ejet JA nødvendigt. |
| H | Receptionist: “Det er receptionen”. Identify intermediary, bind Anna, godkend transferforespørgsel. Skift derefter rolle til lægen; Verify target doctor med ny begrundelse. | Transferreplik identificerer ikke lægen. Ny recipientrevision, ny identitet og nyt spørgsmål kræves; receptionistens svar kan ikke genbruges. |
| I | Sig “Det er den forkerte person” / “Forkert nummer”. Bind syntetisk navn, hvis transferforslag kræver det. | Ingen samtykke; godkendt transferforespørgsel må ikke verificere den nye person. Stop sikkert, eller verificér en ny læge særskilt. |
| J | Intermediary: “Jeg kan hjælpe med det”. Identificér/bind Anna; afspil authority-ask. Giv eksplicit testclaim, fx “Jeg har bemyndigelse til at håndtere denne forespørgsel og oplyse lægens e-mailadresse”. | Claim alene giver ingen authority. Operatøren skal bruge **Attest retained authority claim** med navn/begrundelse, derefter rebind navn til ny revision. Hele navngivne samtykkespørgsmål skal afsluttes før nyt JA. Test også uden claim/attestation: intet JA. Dette afgør ikke juridisk fuldmagt. |
| K | Sig “Jeg har travlt” / “Det passer dårligt”; svar fx “Ring i morgen”. | Callback-/kort afslutning uden samtykke. Der må ikke tilføjes pauser for at ramme en minimumsvarighed. |
| L | Giv først `anna2.test-7@clinic.dk` naturligt. Efter readback: “Adressen er forkert”. Giv `anna3.test-7@clinic.dk`; bekræft først efter nyt fuldt readback. | Gammel kandidat/confirmation invalideres og bevares i historik. Præcis korrektion, nye bytes/ejet svar; aldrig automatisk genbrug af gammel bekræftelse. |
| M | Brug J's sikre authorityopsætning. Begynd at tale, mens det dynamiske navngivne spørgsmål afspilles. | Stop output ved mikrofononset, vis INTERRUPTED med samme playback-ID, intet COMPLETED/åbent consentvindue. Sikker frisk hel spørgeretry eller takeover; aldrig consent fra afbrudt spørgsmål. |
| N | Begynd “Ja …” før et direkte spørgsmål slutter. Lad finalen komme naturligt senere; prøv frisk repeat. | Tidligt onset forbliver tilknyttet gammel spørgeinstans. Forsinket JA må ikke lande på gentagelsen eller aktivere Review YES. Det må ikke kræves, at du kan fremtvinge netværksforsinkelse; notér faktisk observeret rækkefølge. |
| O | Spørg “Hvad koster det?” eller andet uden for de godkendte svar. | Ingen opdigtet svar. Godkend den anbefalede takeover via **Play / Approve next action**, hvis den afventer operatøren. Automation stopper og audit bevares. |
| P | Spørg “Hvordan behandler I mine persondata?” / “Kan du give medicinsk rådgivning?” | Privacy/juridisk/medicinsk indhold til menneske; ingen generativ rådgivning eller samtykke af spørgsmålet. |
| Q | Sig “Jeg vil tale med et menneske” / “Jeg vil tale med en kollega”. | Menneskelig takeover efter den eksplicitte operatørhandling; ingen fortsat automatisk solicitation. |
| R | Sig “Jeg kunne ikke høre dig” / “Jeg forstod ikke spørgsmålet”. Test separat **Stop microphone + takeover**. | Usikker kilde/forbindelsesstop stopper automation sikkert; fejlårsag bevares, ingen gammel sluttekst genbruges som JA. Dette tester failurehåndtering, ikke at en bestemt ASR-fejl blev genkendt perfekt. |


Kun de fire ovenstående emailfixtures er cachede; øvrige værdier stopper sikkert. Mikrofononset skal afbryde playback. Afbrudt output må aldrig få COMPLETED fra en forsinket callback. Privacy-/medicinsk rådgivning eller ønske om kollega skal gå til menneske.

**Open existing Stage 1.9.6 interpreter (manual start)** er kun et manuelt panel. Ingen telefonforbindelse overføres. Interpreterens START/pairing og andre providere er uden for denne retest; start dem ikke uden separat autorisation og korrekte credentials.

## Vurdering, tider og eksport

Brug PASS / FAIL / NEEDS REVIEW pr. scenario og facet. UI tilbyder NOT_TESTED eller BLOCKED i stedet for NEEDS REVIEW; skriv den konkrete tvivl i noten. En sikker takeover kan bestå sikkerhed, samtidig med at ASR/anvendelighed får FAIL. Falsk samtykke er altid FAIL: stop, bevar eksport og kontakt Humza. Ret ikke kode/model/ordlyd/tærskler under testen.

I den nederste **Facet review NOTE**: skriv observationen, sæt **I physically performed the selected facet assessment**, vælg facet/resultat og tryk **Record explicit human facet review using reviewer / note above**. Alle krævede facetter skal gennemgås. Klipfacetter kommer fra de præcise klipreviews. Telephone adapter readiness forbliver NOT_TESTED; produktion forbliver false.

Se **Actual timing**: raw wall clock fortsætter fra opening-start til terminal, og kilde-/outputmedietid vises separat. Naturlige succesforløb sigter mod 30–90 sek.; fyld ikke korte afslag ud. Bevar langsomme/fejlede forsøg og observerede debuggingpauser. Kilde-PCM gemmes ikke. Offline ASR-reference er kun til scoring; den sendes aldrig til recognition.

1. Tryk **Export C-3 acceptance evidence**. Dette er en lokal download, ingen upload.
2. Find `stage20c31-acceptance-<Date.now()>.json` i browserens faktiske downloadmappe (normalt Downloads). Notér det rigtige filnavn og sti.
3. Kontrollér version **stage20c31-local-1**, preflight, previousPreflight, reviews, history/current og alle call-ID'er. `acceptanceDecision` er bevidst NOT_ACCEPTED; `telephoneVerified` og `productionEnabled` er false.
4. Send Humza JSON fra alle forsøg og `C31-human-review-notes.md` via aftalt sikker kanal. Medtag navn, dato/tidszone, OS/browser/headset/mikrofon, branch/HEAD samt hash på `stage-2.0c-3.1-preservation.json` og at dette var en ikke-committet C-3.1-kopi. HEAD alene identificerer ikke ændringerne.
5. Noterne skal indeholde alle 13 klip, de fem smokes (faktisk sagt + literal final), A–R/call-ID/resultat, alle facetter, naturlig varighed og hver udtale-/ASR-/flowfejl. Ingen credentials eller rå kildeaudio.

Ryd ikke localStorage/browserdata før eksport. Ved fejl/full storage: eksportér og kontakt Humza; slet ikke fejlede forsøg. Reload ikke midt i et kald. En ny browser/origin kræver ny preflight. **Kun Asem kan afgive menneskelig vurdering; Humza gennemgår den bagefter. Ingen automatisk accept, merge, deployment eller Stage 2.0D.**

## Hvis noget ikke virker

- Ingen JSON-health: forkert launcher/port. Brug præcis C-3.1-kommandoen; Vite alene er utilstrækkeligt.
- configured:false: nøgle mangler i valgt lokal envfil. Genstart egen server efter konfigurationsrettelse; del ikke nøglen.
- Capture fejler: vælg rigtig mikrofon og kontrollér browser-/OS-tilladelse. Gem fejlen.
- Capture PASS, men auth/transport FAIL: eksportér backenddiagnose, origin/host-flags, status-/fejlkode og events. Nøgle i env er ikke bevis for gyldig provideradgang. Ingen manuel transcript-erstatning.
- Hash/cachemiss/lydfejl: stop og kontakt Humza; ingen TTS/fallback-generering.
- Ingen lyd: kontrollér mute/output/headset. Klik Play som brugerhandling. Approve kun efter reel fysisk lytning.
- A–R låst: mangler aktuel gennemgået mikrofonfinal eller et af de 13 reviews. Det er tilsigtet; ingen bypass.
- Manglende/uklar ASR: gem literal final og hvad du faktisk sagde. Ingen automatisk ordkorrektion.

Valgfrie lokale mockchecks til teknisk hjælper: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `git diff --check`. Generator-/benchmarkkommandoer skal ikke køres. Tests er aldrig fysisk accept.
