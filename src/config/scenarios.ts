export interface ScriptLine { id: string; language: 'da' | 'en'; text: string; expected: string }
export interface Scenario { id: string; label: string; clinic: ScriptLine[]; agent: ScriptLine[] }
const line = (id: string, language: 'da' | 'en', text: string, expected: string): ScriptLine => ({ id, language, text, expected });
const purpose = line('agent-purpose', 'en', 'We are calling because Example Pharma would like to send professional healthcare information to the doctors by email.', 'Vi ringer, fordi Example Pharma gerne vil sende faglig sundhedsinformation til lægerne via e-mail.');
const information = line('agent-information', 'en', 'The information may include professional medical material, information about products and therapy areas, and invitations to professional activities or online meetings.', 'Informationen kan omfatte fagligt medicinsk materiale, information om produkter og terapiområder samt invitationer til faglige aktiviteter eller onlinemøder.');
const request = line('agent-permission', 'en', "We would like the doctor's professional email address and permission to send this information.", 'Vi vil gerne have lægens professionelle e-mailadresse og tilladelse til at sende denne information.');
export const scenarios: Scenario[] = [
  {
    id: 'callback', label: 'Pernille · Ask the doctor / callback',
    clinic: [
      line('clinic-greeting', 'da', 'Hej, du taler med Pernille. Hvad kan jeg hjælpe dig med?', "Hello, you're speaking with Pernille. How can I help you?"),
      line('clinic-information', 'da', 'Hvilken slags information drejer det sig om?', 'What kind of information is it about?'),
      line('clinic-request', 'da', 'Okay. Hvad skal I bruge fra mig?', 'Okay. What do you need from me?'),
      line('clinic-ask-doctor', 'da', 'Jeg skal lige spørge lægen først.', 'I need to ask the doctor first.'),
      line('clinic-callback', 'da', 'Du kan ringe igen i morgen efter klokken ti.', "You can call again tomorrow after ten o'clock.")
    ],
    agent: [purpose, information, request, line('agent-callback', 'en', 'Of course. When would be a convenient time for me to call again?', 'Selvfølgelig. Hvornår vil det passe dig, at jeg ringer igen?')]
  },
  {
    id: 'consent', label: 'HCP · Explicit agreement / email simulation',
    clinic: [
      line('clinic-connect', 'da', 'Hej, du taler med Pernille. Jeg stiller dig om til lægen.', "Hello, you're speaking with Pernille. I will put you through to the doctor."),
      line('hcp-information', 'da', 'Du taler med lægen på klinikken. Hvilken information vil I sende?', 'You are speaking with the doctor at the clinic. What information would you like to send?'),
      line('hcp-agreement', 'da', 'Ja, I må sende den faglige og medicinske information, som du har beskrevet, til mig via e-mail. Min professionelle e-mailadresse er kontakt snabel-a example punktum dk. Jeg kan afmelde fremtidige e-mails.', 'Yes, you may send the professional and medical information you have described to me by email. My professional email address is kontakt@example.dk. I can unsubscribe from future emails.')
    ],
    agent: [purpose, information]
  }
];
export const allScriptLines = [...new Map(scenarios.flatMap(s => [...s.clinic, ...s.agent]).map(l => [l.id, l])).values()];
