const bcrypt = require('bcryptjs');
const { getDb } = require('./src/db');

function seed() {
  const db = getDb();

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const hash = bcrypt.hashSync('123456', 10);
    db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run('Admin', 'admin@restaurant.com', hash, 'admin');
    db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run('Carlos López', 'carlos@restaurant.com', hash, 'waiter');
    db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run('Chef Juan', 'cocina@restaurant.com', hash, 'kitchen');
    console.log('Usuarios creados: admin@restaurant.com / 123456');
  }

  const menuCount = db.prepare('SELECT COUNT(*) as count FROM menu').get().count;
  if (menuCount === 0) {
    const menuItems = [
      { name: 'Ceviche Clásico', category: 'entradas', price: 28.00 },
      { name: 'Papas a la Huancaína', category: 'entradas', price: 18.00 },
      { name: 'Tequeños (6 und)', category: 'entradas', price: 15.00 },
      { name: 'Ensalada César', category: 'entradas', price: 22.00 },
      { name: 'Causa Rellena', category: 'entradas', price: 20.00 },
      { name: 'Lomo Saltado', category: 'principales', price: 35.00 },
      { name: 'Ají de Gallina', category: 'principales', price: 30.00 },
      { name: 'Arroz con Pollo', category: 'principales', price: 28.00 },
      { name: 'Parrilla Mixta', category: 'principales', price: 45.00 },
      { name: 'Tallarines Verdes', category: 'principales', price: 25.00 },
      { name: 'Chicha Morada', category: 'bebidas', price: 8.00 },
      { name: 'Inka Kola 500ml', category: 'bebidas', price: 6.00 },
      { name: 'Agua Mineral', category: 'bebidas', price: 5.00 },
      { name: 'Cerveza Cusqueña', category: 'bebidas', price: 12.00 },
      { name: 'Maracuyá Natural', category: 'bebidas', price: 10.00 },
      { name: 'Suspiro Limeño', category: 'postres', price: 14.00 },
      { name: 'Picarones (4 und)', category: 'postres', price: 12.00 },
      { name: 'Tarta de Chocolate', category: 'postres', price: 16.00 },
      { name: 'Mazamorra Morada', category: 'postres', price: 10.00 },
      { name: 'Helado Artesanal', category: 'postres', price: 11.00 }
    ];
    const insert = db.prepare('INSERT INTO menu (name, category, price) VALUES (?, ?, ?)');
    for (const item of menuItems) {
      insert.run(item.name, item.category, item.price);
    }
    console.log(`Menú creado: ${menuItems.length} platos`);
  }

  const tableCount = db.prepare('SELECT COUNT(*) as count FROM tables').get().count;
  if (tableCount === 0) {
    const tables = [
      { number: 1, capacity: 4 }, { number: 2, capacity: 4 },
      { number: 3, capacity: 2 }, { number: 4, capacity: 6 },
      { number: 5, capacity: 4 }, { number: 6, capacity: 2 },
      { number: 7, capacity: 8 }, { number: 8, capacity: 4 }
    ];
    const insert = db.prepare('INSERT INTO tables (number, capacity) VALUES (?, ?)');
    for (const t of tables) {
      insert.run(t.number, t.capacity);
    }
    console.log('Mesas creadas: 8 mesas');
  }

  console.log('Seed completado.');
}

seed();
