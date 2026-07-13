const clients = [];

function addClient(res) {
  const client = { id: Date.now(), res };
  clients.push(client);
  res.on('close', () => {
    const idx = clients.indexOf(client);
    if (idx !== -1) clients.splice(idx, 1);
  });
}

function broadcast(event, data) {
  clients.forEach(client => {
    try {
      client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch {}
  });
}

module.exports = { addClient, broadcast };
