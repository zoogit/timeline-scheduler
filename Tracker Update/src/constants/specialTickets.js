export const SPECIAL_TICKETS = [
  { label: 'Break', duration: 0.5, color: '#374151' },
  { label: 'Meeting', duration: 0.5, color: '#374151' },
  { label: 'Training', duration: 0.5, color: '#374151' },
];

export const getSpecialTicket = (label) =>
  SPECIAL_TICKETS.find((item) => item.label === label) || SPECIAL_TICKETS[0];
