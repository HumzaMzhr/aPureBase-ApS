# Stage 2.0C-3 — vejledning til dansk menneskelig accepttest

**HUMAN ACCEPTANCE CANDIDATE · NOT ACCEPTED · NOT PRODUCTION READY**

Denne kandidat skal vurderes af en dansktalende kollega. En bestået automatisk
test betyder ikke, at stemmen, mikrofonen, ASR eller telefonlyden er godkendt.
Der må ikke foretages telefonopkald, integration med Twilio, deployment eller
arbejde på Stage 2.0D under denne test. Der sendes ingen bekræftelsesmail eller
registrering til et produktionssystem.

## 1. Hvad er allerede undersøgt, og hvad skal du undersøge?

| Evidens | Status før din test | Din opgave |
|---|---|---|
| Automatiske regressioner | 38 C-3 tests; 1.013 tests i hele projektet; lint, typecheck, build og diff-check bestået | Kontrollér revision og bevaring; kør eventuelt checks nedenfor |
| Lokal WebAudio | Tre faktiske lokale afspilninger gennemført; dette er en teknisk rendergrænse | Kontrollér, hvad du faktisk hører i headsettet |
| Dansk lyttevurdering | NOT_TESTED; ingen menneskelige godkendelser | Vurdér alle 37 optagelser og hele samtaleforløb |
| Fysisk mikrofon / dansk ASR | NOT_TESTED; ingen live ASR-sessioner i C-3-evidensen | Test faktisk tale, transskription, afbrydelse og A–R |
| Naturlig samtalevarighed | NOT_TESTED; ingen fysiske almindelige succesforløb | Bevar alle forsøg, også langsomme og fejlede |
| Telefoni | NOT_TESTED; kun adapterkontrakt testet automatisk | Ikke del af denne test; må ikke markeres bestået |

**Tal naturligt.** Brug ikke overdrevne pauser, et indøvet manuskript eller ændrede
ord for at få softwaren til at bestå. Eksemplerne nedenfor viser betydninger og
sikkerhedsprober, ikke en facitliste, som ASR skal tvinges til at gengive.
Uventede, naturlige formuleringer og fejlede forløb er vigtige resultater.

Ved pakning af de tidligere uncommittede historiske rapporter fandt den fulde
staged PR-diffkontrol to eksisterende whitespace-advarsler: en ekstra blank
slutlinje i `stage-2.0c-2-validation.txt` og `stage-2.0c-3-validation.txt`.
Rapporterne er bevaret byte-for-byte; advarslerne er ikke skjult med undtagelser
eller ændrede whitespace-regler. Det almindelige working-tree `git diff --check`
bestod, men den fulde staged PR-diffkontrol er derfor **ikke ren**. Dette ændrer
ikke resultatet af de 1.013 tests og er ikke en fysisk acceptgodkendelse.

## 2. Computer, software og revision

Brug en computer med Git, Node.js, npm, en almindelig browser og et fysisk
**headset med hovedtelefoner og mikrofon**. Projektet kræver Node ≥22.12.0.
Den lokale automatiske validering er kørt med **Node v25.9.0 og npm 11.12.1**;
brug disse versioner for at matche miljøet. `package-lock.json` er lockfile v3.
Der kræves ingen Python, macOS `say`, ffmpeg eller lydgenerering til C-3.

Udviklerens miljø er macOS. Andre operativsystemers fysiske lydadfærd er ikke
verificeret. På Linux/macOS kan kommandoerne køres i Bash/zsh. På Windows bruges
Git Bash med en lokal Windows-installation af Node og Chrome; WSL-lyd er ikke
verificeret. Versionsstyrings-/testkommandoerne er ikke en fysisk OS-godkendelse.
Brug Google Chrome som i projektets eksisterende vejledning. Notér den præcise
browser- og OS-version; andre browsere skal vurderes som deres eget testmiljø.

Kandidatbranch: **`codex/stage-2.0c3-human-acceptance`**.
Git-remoten er **`https://github.com/HumzaMzhr/aPureBase-ApS.git`**; normal
integrationsbranch er `main`. Kandidaten må ikke merges før Humza har gennemgået
den menneskelige C-3-evidens.

### Ny checkout

```bash
git clone --branch codex/stage-2.0c3-human-acceptance --single-branch https://github.com/HumzaMzhr/aPureBase-ApS.git aPureBase-C3
cd aPureBase-C3
git status --short
git log -2 --oneline
git rev-parse HEAD
```

### Eksisterende checkout

```bash
git status --short
git fetch origin
git switch --track origin/codex/stage-2.0c3-human-acceptance
git pull --ff-only
```

Hvis den lokale kandidatbranch allerede findes, bruges i stedet
`git switch codex/stage-2.0c3-human-acceptance` og `git pull --ff-only`.
Hvis `git status --short` viser dit eget arbejde før skiftet: stop og brug en ny
clone. Brug ikke reset, force-checkout eller sletning af andres filer.

### Fastlås den revision, Humza har sendt

Humza sender den **endelige fulde commit-SHA i PR'en/overdragelsen**. Det sidste
commit indeholder `docs/stage-2.0c3-candidate.json`; feltet `candidateCodeCommit`
angiver det forudgående kode-/dokumentationscommit. Metadatafilen kan ikke
indeholde sit eget commit-hash. Den uforanderlige testrevision er derfor det
endelige commit, der indeholder metadatafilen, ikke kun `candidateCodeCommit`.
Branch og kontrolreglen står også i metadatafilen.

Erstat teksten nedenfor med den fulde SHA fra Humza (ikke branchnavnet):

```bash
git checkout --detach FINAL_COMMIT_SHA_FROM_HUMZA
git rev-parse HEAD
node -e "const m=require('./docs/stage-2.0c3-candidate.json'); console.log(m.branch, m.candidateCodeCommit, m.testRevisionRule)"
```

Kontrollér, at HEAD er præcis den SHA, Humza sendte. `git show --stat HEAD`
skal vise det afsluttende metadata-commit. Der må ikke bruges en senere,
automatisk opdateret branch under samme test. Notér HEAD i din tilbagemelding.

## 3. Installation og lokal konfiguration

Kør fra repository-roden i alle terminaler:

```bash
node --version
npm --version
npm ci
node --import tsx scripts/verify-stage20c3-candidate.ts
```

`npm ci` bruger den eksisterende lockfile; brug ikke `npm update`. Verifikatoren
læser kun lokale filer og kræver ingen nøgler eller providerforbindelse. Den skal
vise `PASS`, 25 statiske og 12 dynamiske optagelser. Kør den **før** første
rehearsal: cachegatewayens lokale `usage.jsonl` kan få nye cache-hit-linjer ved
senere brug. Det er ikke en ændring af WAV-filerne. Bevar journalen som evidens;
nulstil den ikke for at få en efterfølgende hashkontrol til at bestå.

Alle 37 optagelser medfølger uændret. De 12 dynamiske optagelser og metadata er
udelukkende de eksisterende **syntetiske testfixtures** under
`benchmarks/stage20c2-dynamic-cache/`. Ingen nye navne eller adresser skal
genereres. Andre lokale benchmarks/persondata er ikke en del af pakken.

### Lokal `.env.c3` — ingen ElevenLabs-adgang kræves

Opret med din teksteditor en lokal fil `.env.c3` i repository-roden med præcis
følgende ikkehemmelige startkonfiguration:

```dotenv
# Intentionally not a working credential; cached playback only.
ELEVENLABS_API_KEY=LOCAL_CACHE_ONLY_NOT_A_CREDENTIAL
ELEVENLABS_VOICE_ID=gIfqD5jrnhkFu8ENVbXC
ELEVENLABS_MODEL_ID=eleven_flash_v2_5
ELEVENLABS_VOICE_NAME=Isabella
OPENAI_API_KEY=
OPENAI_TRANSCRIPTION_MODE=realtime
OPENAI_LIVE_TRANSCRIBE_MODEL=gpt-live-transcribe
OPENAI_TRANSCRIBE_DELAY=low
AGENT_SILENCE_MS=450
CLINIC_SILENCE_MS=1350
```

`.env.c3` er ignoreret af Git. Del eller commit aldrig en nøgle. Redigér ikke den
eksisterende produktions-/udviklings-`.env`. `DOTENV_CONFIG_PATH` nedenfor vælger
den separate lokale fil. Brug nye terminaler uden allerede eksporterede
provider-/modelvariabler: dotenv overskriver ikke eksisterende miljøvariabler.
Angiv ikke `ELEVENLABS_VOICE_SETTINGS`; de frosne dynamiske fixtures bruger kun
`{"speed":0.95}` i deres settings-hash. Gain 3.5573605757216837, speed 0.95,
voice, modeller, buffere, jitter og sikkerhedsregler skal ikke ændres.

Den eksisterende server kræver et ikke-tomt ElevenLabs-konfigurationsfelt ved
opstart. Ovenstående tydeligt ugyldige **lokale placeholder er ingen credential**
og giver ingen ElevenLabs-adgang. Den bruges kun til lokal konfigurationskontrol.
C-3 bruger `/prepare-cached` og eksisterende WAV-filer; en cachemiss skal fejle.
En rigtig ElevenLabs-nøgle skal ikke anskaffes eller indsættes til denne test.
Brug kun C-3-ruten og aldrig C-2's generationssti `/prepare`.

**Kun lytning:** lad `OPENAI_API_KEY` være tom. Serveren kan køre, og alle 37
optagelser kan afspilles. Sundhedstjekkets `ready:false` betyder her, at live ASR
ikke er konfigureret; det forhindrer ikke cachelytning.

**Fysisk mikrofon/ASR:** Humza skal separat give en autoriseret OpenAI API-nøgle
med adgang/credits til repositoryets `gpt-live-transcribe` via en sikker kanal.
Indsæt den kun lokalt som `OPENAI_API_KEY` i `.env.c3`, og genstart terminal 1.
En ChatGPT-brugerkonto i browseren erstatter ikke serverens API-nøgle.
Serveren skal kunne nå `wss://api.openai.com/v1/realtime?intent=transcription`.
Der påbegyndes først live ASR, når du trykker på mikrofonens Start-knap.
Dette forbruger providercredits. Hvis nøgle, credits, modeladgang eller netværk
mangler: registrér **BLOCKED / NEEDS REVIEW**, udfør lytningen, og kontakt Humza.
Find ikke en anden model eller TTS-løsning for at komme videre.

## 4. Start frontend/backend og cachegateway

Terminal 1 — **frontend og eksisterende backend samlet**:

```bash
DOTENV_CONFIG_PATH=.env.c3 npm run dev
```

Det er den faktiske `dev`-kommando i `package.json` (`tsx server/index.ts`).
Backend på loopback **5173** indlejrer Vites frontend; start ikke samtidig en
ekstra Vite-server på samme port. Startup skal vise `Translator: http://localhost:5173`.

Terminal 2 — gateway til de eksisterende dynamiske cachefiler:

```bash
DOTENV_CONFIG_PATH=.env.c3 node --import tsx server/consentDynamic.ts
```

Gatewayen lytter på **127.0.0.1:5180**. Dens log/health kalder den stadig C-2,
fordi C-3 genbruger den. C-3-rehearsal vælger den cache-only rute
`POST /prepare-cached`; isoleret lytning henter kun `GET /cache/<hash>.wav`.
Serverstart og health laver ingen providerkald. Lad begge terminaler være åbne.

Terminal 3 — sundhedstjek uden providerrequest:

```bash
node --input-type=module -e 'for (const url of ["http://127.0.0.1:5173/consent-call?stage=2.0c3","http://127.0.0.1:5173/api/health","http://127.0.0.1:5180/health"]) { const r=await fetch(url); console.log(url,r.status,r.headers.get("content-type")); if (!r.ok) process.exitCode=1; if (url.endsWith("/health")) console.log(await r.text()); }'
```

Alle tre skal returnere **200**. `/api/health` og gateway-health skal være JSON,
ikke Vites HTML-fallback. Før live ASR skal `/api/health` have `ready:true`;
det er kun bevis for en tilstedeværende nøgle, ikke bevis for gyldig modeladgang.
Kontrollér Isabella / `gIfqD5jrnhkFu8ENVbXC` / `eleven_flash_v2_5` i
`danishVoice`. Gatewayen svarer `status:"ok"`, `stage:"2.0c2"` og
`providerSessionStarted:false`. `missingAudio` handler om den ældre interpreter;
C-3's 37 filer kontrolleres separat af verifikatoren ovenfor.

Åbn præcis **http://127.0.0.1:5173/consent-call?stage=2.0c3** på din egen computer.
Humzas `127.0.0.1` kan ikke tilgås fra din computer. Brug samme origin og
browserprofil gennem hele testen. Skift ikke mellem `localhost`, `127.0.0.1`,
porte eller privat browsing: det giver forskellige lokale reviewarkiver.

### Må ikke køres

Kør **ingen** `generate:audio`, `generate-audio.ts`, `stage20c1-generate.ts`,
`stage20c2-generate.ts`, andre `generate-*`-scripts, providerbenchmarks eller
bulk-/stresstests. Kør heller ikke de historiske rapportgeneratorer: nogle
kræver udviklerens lokale `/tmp`-evidens og kan overskrive historiske rapporter.
Manglende/beskadiget lyd skal rapporteres, aldrig gendannes med TTS.

## 5. Lyt til alle 37 optagelser

**Headset er obligatorisk**, også før mikrofontesten. Vælg headset som fysisk
output og den rigtige mikrofon i operativsystemet og Chrome. Hold en behagelig,
fast volumen og notér niveauet. Brug ikke laptop-højttalere under ASR: stemmen
kan ellers komme ind i mikrofonen og afbryde sig selv.

1. Indtast dit navn i **Reviewer name**. Start ikke et rehearsal endnu.
2. I **01 · Physical listening** vælges hvert punkt i **Recording**: 25 `STATIC`,
   fire `EMAIL` og otte `NAME` = 37. Bekræft nøjagtig dansk tekst og adressen/navnet.
3. Klik **REPLAY / LISTEN**. Applikationen verificerer byte-/tekstidentitet og
   spiller eksisterende lyd. Vent til faktisk slutning; brug replay efter behov.
4. Vurdér udtale, forståelighed, naturlighed, tempo, pauser, sætningssammenføjning,
   professionel tone til klinik/læge, aPureBase-navnet, navne og præcis e-mail.
   Sammenlign statisk/dynamisk lydstyrke; lyt efter forvrængning, clipping og
   unaturlig stilhed. @/snabel-a, punktum, bindestreg, understregning, plus og
   cifrene 2/3/7 skal kunne skelnes. Gæt ikke en uklar karakter fra tekstfeltet.
5. Notér problemet i **NOTE** med phrase/slot, det ord/tegn du hørte, forventet
   lyd/ord, om det gentages, cirka placering i klippet og foreslået forbedring.
   Eksempel: “EMAIL anna…: understregning høres som … ved cirka … sekunder”.
   Adskil en dårlig optagelse fra en forretningsmæssig indvending mod ordlyden.
6. Kun efter fysisk lytning: sæt kryds ved **I physically listened and can assess
   the Danish/audio quality stated in this review** og tryk **APPROVE** eller
   **REJECT**. Rejection kræver en note. Automatisk completion vælger aldrig for dig.
7. Ved tvivl: lad klippet være **NOT_REVIEWED**, skriv en note i den returnerede
   vurdering, og markér **NEEDS REVIEW** dér. UI'et har ikke en NEEDS REVIEW-knap.
   Skriv ikke APPROVE for at kunne komme videre. En note alene er ikke en gemt
   clip-review; kopier derfor uafklarede noter til sign-off-/problemfilen.
8. Eksportér jævnligt. Afslut/arkivér aktive rehearsals før selvstændig QA-lytning.

**PASS:** hele klippet er hørt og forstået, navne/tegn er præcise og professionelt
brugbare. **FAIL:** forkert/uforståelig udtale, vildledende ordlyd, forvrængning
eller en anden konkret uacceptabel fejl; REJECT med note. **NEEDS REVIEW:**
usikker vurdering, manglende fuld lytning eller behov for businessafklaring;
behold NOT_REVIEWED. Afviste optagelser blokerer brug i rehearsal og fremtidig
telefonigodkendelse; de regenereres ikke automatisk.

Storbogstavsmarkering er **BLOCKED**: ingen eksisterende EMAIL-fixture har et
stort bogstav. `Anna@clinic.dk` må ikke prøves som en ny TTS-bestilling. Den
foreslåede tekst og begrundelse findes i `stage-2.0c-3.md`; særskilt autorisation
og nyt review kræves. De eksisterende fixtures beviser heller ikke alle cifre,
alle navne eller alle fremtidige adresser. Lyt til begge syntetiske navne i QA;
det interaktive rehearsal bruger specifikt **Anna Jensen**.

## 6. Fysisk rehearsal — tester og applikation har forskellige roller

Testeren spiller modtageren med sin faktiske stemme og udfører også de
**udtrykkelige operatørhandlinger** i UI'et. Applikationen spiller Isabella,
indsamler mikrofon-PCM midlertidigt, modtager rå dansk ASR, klassificerer
deterministisk og anbefaler næste handling. Den godkender ikke selv identitet,
fuldmagt, samtykke eller e-mail. Tale/lydoptagelser gemmes ikke; tekst,
tidsstempler og reviews gemmes lokalt og i den eksport, du selv henter.

### Fælles start for hvert A–R-forsøg

1. Vælg **Scenario** i **02 · Physical call rehearsal**. Klik **Start / archive
   previous rehearsal**; notér call-ID og bogstav. Bevar alle forsøg.
2. Sæt headset-krydset, og klik **Start microphone + Danish ASR (provider usage)**.
   Tillad mikrofon i Chrome og operativsystemet. Ved faktisk forbindelse skal
   `microphone.capture_ready` / `recognition.started` ses i events. Et kryds eller
   “START REQUESTED” alene er ikke mikrofonevidens. Kig efter provider-finals.
3. Klik **Play / Approve next action** for opening. Applikationen spiller; vent
   normalt til hele klippet er færdigt. Den skal derefter vente på operatøren.
4. Som operatør: skriv en konkret testbegrundelse i **Operator evidence / consent
   review reason**. Efter opening vælges **Verify target doctor** for direkte
   læge eller **Identify intermediary** for receptionist. En replik som “Det er
   mig” er ikke identitetsbevis. Brug kun syntetiske identiteter i denne øvelse.
5. Ved navneforløb: klik **Bind supplied synthetic Anna Jensen contact to current
   revision**. Dette er en testattestation; ingen rigtig patients/kliniks data.
   Efter recipient-/authorityændringer kræves ny binding til den nye revision.
6. Fortsæt med **Play / Approve next action**, og læs **Next** samt playbackstatus.
   Lad normale spørgsmål slutte, før du svarer. M/N er bevidste undtagelser.
   Der må ikke afspilles en forklarende sætning efter et samtykkespørgsmål på en
   måde, der fejlagtigt genbruger svaret. Et nyt spørgsmål skal have nyt ejerskab.
7. Efter et gyldigt endeligt JA skal operatøren skrive begrundelse og klikke
   **Review YES**. **Review NO / Review UNCLEAR** bruges tilsvarende. Knapper må
   aldrig bruges til at overtrumfe manglende evidens. Tjek altid det rå transcript.
8. Ved e-mail: sig adressen naturligt, fx “anna snabel-a clinic punktum dk”.
   Systemet må kun bruge en faktisk genkendt literal kandidat. Hvis ASR ikke
   producerer `anna@clinic.dk`, må du ikke rette teksten manuelt for at bestå.
   Registrér ASR-/emailbegrænsningen og takeover/NEEDS REVIEW. En separat manual
   simulation kan undersøge UI'et, men er aldrig fysisk ASR-accept.
9. Hvis UI'et viser **Approve exact normalization**, sammenlign først rå tekst og
   kandidat og begrund godkendelsen; intet domæne eller tegn må opfindes.
   Hele readbacksekvensen, inklusive **Er det korrekt?**, skal være COMPLETED.
   Sig så fx “Ja, adressen er korrekt”. Operatøren klikker derefter **Approve
   owned email confirmation**, og godkender success-close. Tidligere JA er ikke
   e-mailbekræftelse. Ved korrektion kræves nyt readback og nyt svar.
10. Slut/arkivér hvert forsøg. **Stop microphone + takeover** afslutter kontinuitet
    og er selv en takeover-test; den genstarter ikke samme samtale i smug.
    Ved aktive normale kald afslutter **End rehearsal** uden at opfinde succes.
    Fejl/takeover eller terminal tilstand stopper ASR. Kontrollér at mikrofonen
    ikke fortsætter, før du starter et nyt forsøg.

### A–R: udfør hvert forløb og behold også fejl

Tabellen angiver din handling ud over fællesproceduren og det forventede
sikkerhedsresultat. Brug også dine egne normale danske variationer. Hvis en
rimelig variation ikke understøttes, er sikker takeover bedre end opfundet
samtykke, men variationens anvendelighed er stadig et problem, som skal noteres.

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

De fire eneste cachede adresser er `anna@clinic.dk`, `anna2.test-7@clinic.dk`,
`anna3.test-7@clinic.dk` og `a_b+2@x.dk`. Lyt også til den sidste adresse i QA
(understregning/plus); ændr ikke rehearsaladressen til en ukendt fixture. En
cachemiss skal stoppe, ikke lave TTS. Unaturlig dansk eller fonetisk forkert
NAME/EMAIL er et lytteproblem, selv om hash/provenance passer.

## 7. Sikkerhedscheck, takeover og tidsmåling

For hvert relevante forsøg: kontrollér, at partials, tavshed, “okay”, “tak”,
“måske”, spørgsmål, tidligt onset, afbrudt spørgsmål, stale JA, forkert person
og manglende/tilbagekaldt authority **aldrig bliver samtykke**. Recipient- eller
authorityændringer skal invalidere tilhørende spørge-/emailbevis. Et endeligt
nej efter en partial, der lignede ja, må aldrig blive samtykke. Hold rå ASR og
klassifikation adskilt: softwaren må ikke “rette” ordene for at opnå JA.

Et sikkert stop/takeover kan bestå sikkerhedschecket, samtidig med at samtalens
anvendelighed/ASR får FAIL eller NEEDS REVIEW. Ethvert falsk samtykke er **FAIL**:
stop den pågældende test og send eksport/call-ID til Humza. Forsøg ikke at reparere
kode, ordlyd, modeller eller tærskler under accepttesten.

Ved HUMAN_TAKEOVER skal call-ID, turns, recipient, authority, samtykke, email og
årsag stadig fremgå af eksporten. **Open existing Stage 1.9.6 interpreter
(manual start)** må åbnes for at kontrollere panelet. Det er ikke en overført
telefonforbindelse. Pairing/START er separate handlinger og kan starte andre
betalte providere; udfør dem ikke under C-3 uden yderligere autorisation og
rigtige credentials. En ugyldig ElevenLabs-placeholder kan ikke lave fallback-TTS.

Gennemgå **Actual timing**. Medietid = faktisk Isabella-output + observerede
modtagerintervaller; wall-clock = opening-start til terminal tilstand. De er ikke
det samme. Målet for almindelige naturlige succesforløb er 30–90 sekunder; korte
afslag må ikke fyldes ud. Alle langsomme forsøg skal beholdes. **Mark debugging
pause / End debugging pause** kan bruges mellem turns, når output/mikrofon er
stoppet; raw wall time fortsætter og må ikke reduceres for at få et PASS. Stop af
ASR afslutter kontinuiteten, så planlæg debugging som et separat forsøg.

I **Partial/final, VAD, endpoint and transport events** kontrolleres faktisk
onset, owner, slutning og final. Lokal VAD er ikke fonetisk ordalignment eller
kalibreret confidence. Ved ASR-fejl: skriv, hvad du faktisk sagde, og den rå
providerfinal. Brug **Offline ASR reference for last final — never sent to
recognition** og **Record offline ASR score**, mens den relevante providerfinal
er senest. Reference bruges kun offline; efterrationalisér ikke ordene.

## 8. Vurdering, problemrapport og matrix

For hvert A–R-forsøg og hver facet returneres **PASS / FAIL / NEEDS REVIEW**:

- **PASS:** faktisk udført med påkrævet fysisk evidens og forventet sikkert
  resultat; ved samtykkeforløb skal hele kæden være dokumenteret.
- **FAIL:** konkret reproducerbar kvalitets-/ASR-/flowfejl eller brud på en
  sikkerhedsregel. Angiv call-ID, turn/playback-ID og hvad du hørte/sagde.
- **NEEDS REVIEW:** ikke udført, uafklaret, manglende adgang, tvetydig evidens eller
  business-/udtaletvivl. Må ikke tælles som PASS.

UI'ets matrix tilbyder **PASS / FAIL / NOT_TESTED / BLOCKED**, ikke NEEDS REVIEW.
Brug NOT_TESTED ved uafklaret/ikke udført og BLOCKED ved en konkret hindring;
skriv “NEEDS REVIEW: …” i noten og returfilen. Vælg facet/resultat i **03 ·
Acceptance matrix**, skriv reviewer/NOTE og sæt den fysiske attestationscheckbox
ovenfor; klik **Record explicit human facet review using reviewer / note above**.
Kliplistefacetter beregnes fra de eksplicitte clipreviews, ikke fra et manuelt
facet-PASS. Telefoni skal fortsat være NOT_TESTED; contract-only må ikke forveksles
med et fysisk telefonipass. Eksporten siger bevidst fortsat NOT_ACCEPTED.

Lav en separat UTF-8-fil `C3-human-review-notes.md` med en A–R-tabel (alle forsøg),
en række pr. pronunciation-/wording-/ASR-problem og sign-off nedenfor. Notér også
eventuelle uafklarede clipnoter. Brug syntetiske data; upload ikke nøgler eller
rigtige patient-/kontaktoplysninger.

## 9. Eksport og præcis overdragelse til Humza

1. Tryk **Export C-3 acceptance evidence** øverst på C-3-siden. Det laver en lokal
   JSON-download; der er ingen automatisk upload.
2. Filnavnet i applikationen er præcis **`stage20c3-acceptance-<Date.now()>.json`**,
   hvor `<Date.now()>` er eksportens Unix-tid i millisekunder. Fx det tidligere
   tekniske smoke-navn var `stage20c3-acceptance-1792330201269.json`; dit navn får
   et nyt tidsstempel. Der er ingen fast session-ID i filnavnet.
3. Browserens valgte downloadmappe bestemmer placeringen. Normalt er det
   `~/Downloads/` på macOS/Linux eller `%USERPROFILE%\Downloads\` på Windows;
   projektet kan ikke garantere en bestemt absolut mappe. Find den faktisk
   downloadede fil i browserens Downloads, og notér den fulde sti. Den gemmes
   **ikke** automatisk i repositoryets `docs/`.
4. Åbn kopien i en teksteditor. Bekræft `version: "stage20c3-local-1"`, reviews,
   history/current, events/turns og de forventede call-ID'er. `sourceAudioStored`
   er false; `telephoneVerified` og `productionEnabled` er false. Manual simulation
   må ikke beskrives som mikrofonaccept. Bevar alle periodiske eksporter med
   forskellige navne; browseren kan også tilføje suffikser ved navnekollision.
5. Send Humza JSON-filerne, `C3-human-review-notes.md`, den fulde HEAD-SHA,
   branch, OS/browser/Node/npm, headset/mikrofon og eventuelle fejlskærmbilleder
   uden credentials. Send også ændrede cache-hit-journallinjer, hvis Humza beder
   om dem; send aldrig `.env.c3`, API-nøgler, `node_modules` eller rå kildeaudio.
   Brug den aftalte sikre kanal til transcript-/emailholdige eksporter.

LocalStorage er bundet til denne browser/origin. Ryd ikke browserdata før eksport.
Der er ingen generel import-/sammenfletknap til en anden computer. Arkivet er
begrænset (60 afsluttede rehearsals); hvis lagring fejler/er fuld, eksportér og
kontakt Humza i stedet for at slette fejlede forsøg. Reload midt i et kald må
ikke bruges som en genvej; arkivér/eksportér først.

## 10. Fejlfinding uden at ændre kandidaten

| Problem | Kontrollér / gør |
|---|---|
| Frontend åbner ikke | Begge terminaler står i repository-roden. Terminal 1 kører; port 5173 er ledig. Stop kun din egen gamle proces med Ctrl+C. Ingen anden port/LAN-host; URL skal være den ovenfor. |
| Backend-health er HTML / forkert app | Du har startet Vite alene eller en anden proces på 5173. Brug `DOTENV_CONFIG_PATH=.env.c3 npm run dev`; forvent JSON fra `/api/health`. |
| `Missing ElevenLabs configuration` | `.env.c3` findes i cwd, er valgt via DOTENV_CONFIG_PATH og har de ikkehemmelige placeholder-/voicefelter. Kræver ingen rigtig ElevenLabs-nøgle. Genstart. |
| Gateway mangler / lyd404 | Terminal 2 kører på 5180; alle 12 `.wav` og `.json` er i den eksakte cachemappe fra Git. Kør verifikator før testen. Manglende/beskadiget fil → BLOCKED; ingen generation eller hashredigering. |
| `Cache settings mismatch` / hashfejl | Stop. Kontrollér revision og at ELEVENLABS_VOICE_SETTINGS ikke er sat i terminal/.env.c3. Ingen bypass, ny lyd eller metadatarettelse. Send fejlen til Humza. |
| Ingen lyd / browser blokerer audio | Klik REPLAY/LISTEN som en virkelig brugerhandling; tjek tab-/OS-mute, headsetoutput og volumen. Vent på faktisk completion, men markér aldrig menneskelig godkendelse, hvis du ikke hørte klippet. |
| Mikrofon nægtet / ingen frames | Chrome-siteindstillinger for `127.0.0.1` → mikrofon → tillad; vælg rigtig mikrofon. Tillad Chrome i OS' privatlivs-/mikrofonindstillinger. Luk appen, der bruger enheden, om nødvendigt. Eksportér fejl og start nyt forsøg; ingen genbrug af gamle owners. |
| Start-knappen disabled | Start rehearsal først, brug port 5173, headsetcheckbox, ingen QA/output/debugpause eller storagefejl. På port 5175 er fysisk mic bevidst disabled. |
| ASR403 / disconnect / ingen final | OPENAI_API_KEY mangler/ugyldig, to aktive sockets, forkert origin, model-/credit-/netværksproblem eller timeout. Tjek backendterminal uden at dele key; stop og registrér BLOCKED. Health ready:true garanterer ikke provideradgang. |
| Isabella afbryder sig selv | Stop, kontrollér fysisk headset og ekko/andre lydkilder. Notér fejlen; ændr ikke VAD/endpoint/buffer for at få PASS. |
| Naturlig email bliver ikke literal / frase ukendt | Gem rå ASR og faktisk sagt tekst; lad det fejle sikkert/tage over. Ingen manuelt rettet tekst som erstatning for ASR-pass. |
| Rejected asset blokerer videre flow | Det er tilsigtet. Bevar rejection, notér hvilke scenarier der er BLOCKED; ingen automatisk regenerering eller falsk APPROVE. |
| Export/storagefejl | Eksportér straks mens siden stadig er åben; kontrollér browserens download-/lagringstilladelse. Bevar fejlen og kontakt Humza før rydning. |

## 11. Valgfrie automatiske checks på kollegaens computer

Disse tests bruger mocks og lokale sockets, ikke live providercredentials.
Kør ikke med projektets generator-/benchmarkkommandoer. Node skal kunne åbne
loopback sockets; noter eventuelle miljøfejl separat fra fysiske fejl.

```bash
npm test -- tests/consent-stage20c3.test.ts tests/consent-stage20c3-view.test.tsx
npm test
npm run lint
npm run typecheck
npm run build
git diff --check
```

Forvent 38 fokuserede / 1.013 samlede tests. Vites eksisterende >500 kB chunkwarning
er kendt og ikke et fysisk PASS. Ingen tests må fjernes eller svækkes.

## 12. Testerens sign-off (kopiér til C3-human-review-notes.md)

```text
Testerens navn:
Dato/tidszone:
Branch: codex/stage-2.0c3-human-acceptance
Fuld testet HEAD-SHA:
OS / maskine:
Node / npm:
Browser / version:
Headset / output / volumen:
Mikrofon / input:
Alle 37 optagelser gennemgået? Godkendt / afvist / uafklaret antal:
A–R og alle forsøg / call-ID'er / resultat pr. scenario:
Dansk lytning: PASS / FAIL / NEEDS REVIEW
Fysisk mikrofon / ASR: PASS / FAIL / NEEDS REVIEW
Samtykke- og authoritysikkerhed: PASS / FAIL / NEEDS REVIEW
Interruption / stale YES / emailkorrektion: PASS / FAIL / NEEDS REVIEW
Naturlig samtalevarighed: PASS / FAIL / NEEDS REVIEW
Telefoni: NOT_TESTED — ikke del af C-3
Overordnet menneskelig anbefaling: PASS / FAIL / NEEDS REVIEW
Eksporterede filnavne og faktiske lokale stier:
Problemer / manglende tests / øvrige kommentarer:
```

Sign-off er din vurdering, ikke automatisk projektaccept. **C-3 forbliver
NOT ACCEPTED**, indtil Humza har gennemgået den konkrete menneskelige evidens.
Ingen merge, deployment eller telefoni følger automatisk af din anbefaling.
