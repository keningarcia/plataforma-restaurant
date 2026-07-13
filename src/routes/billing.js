const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/tables', (req, res) => {
  const db = getDb();
  const rows = db.prepare(
    "SELECT DISTINCT table_number FROM orders WHERE status IN ('ready', 'served') ORDER BY table_number"
  ).all();
  res.json(rows.map(r => r.table_number));
});

router.get('/table/:number', (req, res) => {
  const db = getDb();
  const orders = db.prepare(
    "SELECT * FROM orders WHERE table_number = ? AND status IN ('ready', 'served') ORDER BY created_at"
  ).all(req.params.number);
  const parsed = orders.map(o => ({ ...o, items: JSON.parse(o.items) }));
  res.json(parsed);
});

router.post('/pay', authenticate, [
  body('table_number').isInt({ min: 1 }).withMessage('Número de mesa requerido'),
  body('payment_method').optional().isIn(['efectivo', 'tarjeta', 'yape'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { table_number, payment_method } = req.body;

  const db = getDb();
  const orders = db.prepare(
    "SELECT * FROM orders WHERE table_number = ? AND status IN ('ready', 'served')"
  ).all(table_number);

  if (orders.length === 0) {
    return res.status(404).json({ error: 'No hay pedidos pendientes de cobro' });
  }

  const now = new Date().toISOString();
  const method = payment_method || 'efectivo';
  const insertHistory = db.prepare(
    'INSERT INTO history (original_id, table_number, waiter, items, total, status, created_at, billed_at, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const deleteOrder = db.prepare('DELETE FROM orders WHERE id = ?');

  const transaction = db.transaction(() => {
    for (const order of orders) {
      insertHistory.run(order.id, order.table_number, order.waiter, order.items, order.total, 'billed', order.created_at, now, method);
      deleteOrder.run(order.id);
    }
  });

  transaction();
  res.json({ message: `Mesa ${table_number} cobrada exitosamente`, billed: orders.length, payment_method: method });
});

router.get('/history', (req, res) => {
  const db = getDb();
  const { from, to, table, waiter, payment_method, page, limit } = req.query;

  let countSql = 'SELECT COUNT(*) as total FROM history WHERE 1=1';
  let sql = 'SELECT * FROM history WHERE 1=1';
  const params = [];

  if (from) { sql += ' AND date(created_at) >= date(?)'; countSql += ' AND date(created_at) >= date(?)'; params.push(from); }
  if (to) { sql += ' AND date(created_at) <= date(?)'; countSql += ' AND date(created_at) <= date(?)'; params.push(to); }
  if (table) { sql += ' AND table_number = ?'; countSql += ' AND table_number = ?'; params.push(parseInt(table)); }
  if (waiter) { sql += ' AND waiter = ?'; countSql += ' AND waiter = ?'; params.push(waiter); }
  if (payment_method) { sql += ' AND payment_method = ?'; countSql += ' AND payment_method = ?'; params.push(payment_method); }

  sql += ' ORDER BY created_at DESC';

  const currentPage = Math.max(1, parseInt(page) || 1);
  const limitVal = Math.min(100, Math.max(1, parseInt(limit) || 50));
  const offset = (currentPage - 1) * limitVal;

  const total = db.prepare(countSql).get(...params).total;

  sql += ' LIMIT ? OFFSET ?';
  const rows = db.prepare(sql).all(...params, limitVal, offset);
  const parsed = rows.map(r => ({ ...r, items: JSON.parse(r.items) }));

  res.json({
    data: parsed,
    pagination: {
      page: currentPage,
      limit: limitVal,
      total,
      totalPages: Math.ceil(total / limitVal)
    }
  });
});

router.get('/history/filters', (req, res) => {
  const db = getDb();
  const tables = db.prepare('SELECT DISTINCT table_number FROM history ORDER BY table_number').all();
  const waiters = db.prepare("SELECT DISTINCT waiter FROM history WHERE waiter IS NOT NULL AND waiter != '' ORDER BY waiter").all();
  res.json({
    tables: tables.map(r => r.table_number),
    waiters: waiters.map(r => r.waiter)
  });
});

module.exports = router;
