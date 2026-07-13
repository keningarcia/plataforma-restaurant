const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

router.get('/', authenticate, authorize('admin'), (req, res) => {
  const db = getDb();
  const users = db.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY name').all();
  res.json(users);
});

router.get('/:id', authenticate, authorize('admin'), (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(user);
});

router.post('/', authenticate, authorize('admin'), [
  body('name').notEmpty().withMessage('Nombre requerido'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 4 }).withMessage('Contraseña debe tener al menos 4 caracteres'),
  body('role').isIn(['admin', 'waiter', 'kitchen']).withMessage('Rol inválido')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { name, email, password, role } = req.body;
  const db = getDb();

  const dup = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (dup) return res.status(409).json({ error: 'Ya existe un usuario con ese email' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(name, email, hash, role);
  const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(user);
});

router.put('/:id', authenticate, authorize('admin'), (req, res) => {
  const { name, email, role } = req.body;
  const db = getDb();

  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (email && email !== existing.email) {
    const dup = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, req.params.id);
    if (dup) return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
  }

  db.prepare('UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?').run(
    name || existing.name,
    email || existing.email,
    role || existing.role,
    req.params.id
  );
  const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(req.params.id);
  res.json(user);
});

router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ message: 'Usuario eliminado' });
});

router.patch('/:id/password', authenticate, (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Contraseña actual y nueva requeridas' });
  }
  if (new_password.length < 4) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 4 caracteres' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (parseInt(req.params.id) !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'No puedes cambiar la contraseña de otro usuario' });
  }

  const valid = bcrypt.compareSync(current_password, user.password);
  if (!valid) return res.status(400).json({ error: 'Contraseña actual incorrecta' });

  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.params.id);
  res.json({ message: 'Contraseña actualizada correctamente' });
});

module.exports = router;
