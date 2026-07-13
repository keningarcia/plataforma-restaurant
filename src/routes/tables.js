const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const tables = db.prepare('SELECT * FROM tables ORDER BY number').all();
  res.json(tables);
});

router.post('/', authenticate, authorize('admin'), [
  body('number').isInt({ min: 1 }).withMessage('Número de mesa inválido'),
  body('capacity').optional().isInt({ min: 1 }).withMessage('Capacidad inválida')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { number, capacity } = req.body;
  const db = getDb();
  const dup = db.prepare('SELECT id FROM tables WHERE number = ?').get(number);
  if (dup) return res.status(409).json({ error: 'Ya existe una mesa con ese número' });

  const result = db.prepare('INSERT INTO tables (number, capacity) VALUES (?, ?)').run(number, capacity || 4);
  const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(table);
});

router.put('/:id', authenticate, authorize('admin'), (req, res) => {
  const { number, capacity } = req.body;
  const db = getDb();
  const existing = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Mesa no encontrada' });

  if (number) {
    const dup = db.prepare('SELECT id FROM tables WHERE number = ? AND id != ?').get(number, req.params.id);
    if (dup) return res.status(409).json({ error: 'Ya existe una mesa con ese número' });
  }

  db.prepare('UPDATE tables SET number = ?, capacity = ? WHERE id = ?').run(
    number || existing.number,
    capacity || existing.capacity,
    req.params.id
  );
  const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id);
  res.json(table);
});

router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM tables WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Mesa no encontrada' });
  res.json({ message: 'Mesa eliminada' });
});

module.exports = router;
