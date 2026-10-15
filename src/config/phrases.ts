export interface Phrase { id: string; label: string; en: string; da: string }
export const opening: Phrase = {
  id: 'opening', label: 'Demo opening',
  en: "Hello, you're speaking with Isabella. I'm calling on behalf of aPureBase. In the future, we would like to send professional information by email to the doctors. Can you help me with the doctor's email address?",
  da: 'Hej, du taler med Isabella. Jeg ringer på vegne af aPureBase. I fremtiden vil vi gerne sende faglig information på mail til lægerne. Kan du hjælpe mig med lægens e-mailadresse?'
};
export const phrases: Phrase[] = [
  { id: 'purpose', label: 'Purpose of call', en: 'We are contacting healthcare professionals because the company would like to send relevant professional and medical information by email.', da: 'Vi kontakter sundhedspersoner, fordi virksomheden gerne vil sende relevant faglig og medicinsk information via e-mail.' },
  { id: 'request-email', label: 'Request email', en: "Can you please provide the doctor's professional email address?", da: 'Kan du oplyse lægens professionelle e-mailadresse?' },
  { id: 'information', label: 'What information?', en: 'The information may include medical and professional material, information about products and therapy areas, and invitations to professional activities or online meetings.', da: 'Informationen kan omfatte medicinsk og fagligt materiale, information om produkter og terapiområder samt invitationer til faglige aktiviteter eller onlinemøder.' },
  { id: 'unsubscribe', label: 'Unsubscribe', en: 'The recipient can unsubscribe from future emails.', da: 'Modtageren kan afmelde fremtidige e-mails.' },
  { id: 'callback', label: 'Callback', en: 'When would be a convenient time for me to call again?', da: 'Hvornår vil det passe dig, at jeg ringer igen?' },
  { id: 'thank-you', label: 'Thank you', en: 'Thank you very much for your help. Have a good day.', da: 'Mange tak for din hjælp. Hav en god dag.' }
];
export const phraseAudio = (id: string) => `/audio/${id}.wav`;
