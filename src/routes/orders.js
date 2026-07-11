const express = require('express');
const { getDb } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const orders = db.prepare('SELECT * FROM orders WHERE status != ? ORDER BY created_at DESC').all('billed');
  const parsed = orders.map(o => ({ ...o, items: JSON.parse(o.items) }));
  res.json(parsed);
});

router.post('/', (req, res) => {
  const { table_number, waiter, items, total } = req.body;
  if (!table_number || !items || items.length === 0) {
    return res.status(400).json({ error: 'Mesa e items requeridos' });
  }
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO orders (table_number, waiter, items, total) VALUES (?, ?, ?, ?)'
  ).run(table_number, waiter || 'Mesero', JSON.stringify(items), total || 0);
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);
  order.items = JSON.parse(order.items);
  res.status(201).json(order);
});

router.patch('/:id/status', authenticate, (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'preparing', 'ready', 'served'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }
  const db = getDb();
  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Pedido no encontrado' });

  if (status === 'served') {
    db.prepare(
      'UPDATE orders SET status = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).run('served', req.params.id);
  } else {
    db.prepare(
      'UPDATE orders SET status = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).run(status, req.params.id);
  }
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  order.items = JSON.parse(order.items);
  res.json(order);
});

router.get('/stats', (req, res) => {
  const db = getDb();
  const pending = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'").get().count;
  const preparing = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'preparing'").get().count;
  const ready = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'ready'").get().count;
  const served = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'served'").get().count;
  const activeTables = db.prepare(
    "SELECT COUNT(DISTINCT table_number) as count FROM orders WHERE status IN ('pending','preparing','ready','served')"
  ).get().count;

  res.json({ pending, preparing, ready, served, activeTables });
});

module.exports = router;
