const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const items = db.prepare('SELECT * FROM menu ORDER BY category, id').all();
  res.json(items);
});

router.get('/:category', (req, res) => {
  const db = getDb();
  const items = db.prepare('SELECT * FROM menu WHERE category = ? ORDER BY id').all(req.params.category);
  res.json(items);
});

router.post('/', authenticate, authorize('admin'), [
  body('name').notEmpty().withMessage('Nombre requerido'),
  body('category').isIn(['entradas', 'principales', 'bebidas', 'postres']).withMessage('Categoría inválida'),
  body('price').isFloat({ min: 0 }).withMessage('Precio inválido')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { name, category, price, available } = req.body;
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO menu (name, category, price, available) VALUES (?, ?, ?, ?)'
  ).run(name, category, price, available !== false ? 1 : 0);
  const item = db.prepare('SELECT * FROM menu WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(item);
});

router.put('/:id', authenticate, authorize('admin'), (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { name, category, price, available } = req.body;
  const db = getDb();
  const existing = db.prepare('SELECT * FROM menu WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Plato no encontrado' });

  db.prepare(
    'UPDATE menu SET name = ?, category = ?, price = ?, available = ? WHERE id = ?'
  ).run(
    name || existing.name,
    category || existing.category,
    price != null ? price : existing.price,
    available != null ? (available ? 1 : 0) : existing.available,
    req.params.id
  );
  const item = db.prepare('SELECT * FROM menu WHERE id = ?').get(req.params.id);
  res.json(item);
});

router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM menu WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Plato no encontrado' });
  res.json({ message: 'Plato eliminado' });
});

module.exports = router;
