const express = require('express');
const { getDb } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const tables = db.prepare('SELECT * FROM tables ORDER BY number').all();
  res.json(tables);
});

router.post('/', authenticate, (req, res) => {
  const { number, capacity } = req.body;
  if (!number) return res.status(400).json({ error: 'Número de mesa requerido' });
  const db = getDb();
  const dup = db.prepare('SELECT id FROM tables WHERE number = ?').get(number);
  if (dup) return res.status(409).json({ error: 'Ya existe una mesa con ese número' });
  const result = db.prepare('INSERT INTO tables (number, capacity) VALUES (?, ?)').run(number, capacity || 4);
  const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(table);
});

router.put('/:id', authenticate, (req, res) => {
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

router.delete('/:id', authenticate, (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM tables WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Mesa no encontrada' });
  res.json({ message: 'Mesa eliminada' });
});

module.exports = router;
