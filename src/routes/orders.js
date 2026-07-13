const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../db');
const { authenticate } = require('../middleware/auth');
const { broadcast } = require('../sse');

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const orders = db.prepare("SELECT * FROM orders WHERE status NOT IN ('billed', 'cancelled') ORDER BY created_at DESC").all();
  const parsed = orders.map(o => ({ ...o, items: JSON.parse(o.items) }));
  res.json(parsed);
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

router.get('/:id', (req, res) => {
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
  order.items = JSON.parse(order.items);
  res.json(order);
});

router.post('/', [
  body('table_number').isInt({ min: 1 }).withMessage('Número de mesa inválido'),
  body('items').isArray({ min: 1 }).withMessage('Debe incluir al menos un item'),
  body('total').isFloat({ min: 0 }).withMessage('Total inválido')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { table_number, waiter, items, total } = req.body;
  const waiter_id = req.user ? req.user.id : null;
  const db = getDb();

  const result = db.prepare(
    'INSERT INTO orders (table_number, waiter, waiter_id, items, total) VALUES (?, ?, ?, ?, ?)'
  ).run(table_number, waiter || 'Mesero', waiter_id, JSON.stringify(items), total || 0);

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);
  order.items = JSON.parse(order.items);

  broadcast('new-order', { id: order.id, table_number: order.table_number });

  res.status(201).json(order);
});

router.put('/:id', authenticate, [
  body('items').isArray({ min: 1 }).withMessage('Debe incluir al menos un item'),
  body('total').isFloat({ min: 0 }).withMessage('Total inválido')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const db = getDb();
  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Pedido no encontrado' });
  if (existing.status !== 'pending') return res.status(400).json({ error: 'Solo se pueden editar pedidos pendientes' });

  const { items, total } = req.body;
  db.prepare("UPDATE orders SET items = ?, total = ?, updated_at = datetime('now') WHERE id = ?").run(
    JSON.stringify(items), total, req.params.id
  );

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  order.items = JSON.parse(order.items);
  res.json(order);
});

router.patch('/:id/status', authenticate, (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'preparing', 'ready', 'served', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Pedido no encontrado' });

  db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, req.params.id);

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  order.items = JSON.parse(order.items);

  broadcast('order-update', { id: order.id, status: order.status, table_number: order.table_number });

  res.json(order);
});

router.patch('/:id/cancel', authenticate, (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Pedido no encontrado' });
  if (existing.status !== 'pending') return res.status(400).json({ error: 'Solo se pueden cancelar pedidos pendientes' });

  db.prepare("UPDATE orders SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?").run(req.params.id);

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  order.items = JSON.parse(order.items);

  broadcast('order-update', { id: order.id, status: 'cancelled', table_number: order.table_number });

  res.json(order);
});

module.exports = router;
