export default async () => {
  const publicKey = process.env.CORA_VAPID_PUBLIC_KEY || '';
  const privateKey = process.env.CORA_VAPID_PRIVATE_KEY || '';
  return Response.json({
    available: Boolean(publicKey && privateKey),
    publicKey: publicKey && privateKey ? publicKey : null,
    channel: 'web-push',
    scope: 'eventos oficiais publicados, inicialmente calendário 2026',
    reminders: ['dia anterior às 18h', 'dia do evento às 7h'],
  }, {headers:{'Cache-Control':'no-store'}});
};
