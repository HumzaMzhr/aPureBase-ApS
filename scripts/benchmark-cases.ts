export const benchmarkCases = [
  { id: 'greeting', text: 'Hello, how can I help you?', length: 'short' },
  { id: 'information', text: 'What kind of information would you like to send?', length: 'short' },
  { id: 'unavailable', text: "The doctor isn't available right now.", length: 'short' },
  { id: 'callback', text: 'Can you call tomorrow after ten?', length: 'short' },
  { id: 'refusal', text: "No thank you, we're not interested.", length: 'short' },
  { id: 'uncertainty', text: 'I need to ask the doctor first.', length: 'short' },
  { id: 'long-question', text: 'Before I pass your request to the doctor, could you explain which company you represent, what kind of professional information you want to send, and whether the doctor can unsubscribe later? I cannot give permission on behalf of the doctor.', length: 'long' },
  { id: 'email', text: 'My professional email address is anna hyphen two dot jensen at example dot d k. Please read it back so I can check the spelling.', length: 'medium' },
  { id: 'numbers', text: 'Please call on the twenty first of October at ten thirty. The reference number is four seven two nine.', length: 'medium' },
  { id: 'unexpected', text: 'Does aPureBase recommend changing the dose of this medicine, and can you guarantee that the treatment is safe?', length: 'medium' }
] as const;
