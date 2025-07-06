const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT,
    price REAL,
    image TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT,
    customer_email TEXT,
    total REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    FOREIGN KEY(order_id) REFERENCES orders(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  )`);
});

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/product', (req, res) => res.sendFile(path.join(__dirname, 'public', 'product.html')));
app.get('/cart', (req, res) => res.sendFile(path.join(__dirname, 'public', 'cart.html')));
app.get('/checkout', (req, res) => res.sendFile(path.join(__dirname, 'public', 'checkout.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products', (err, rows) => {
    if (err) res.status(500).json({ error: err });
    else res.json(rows);
  });
});

app.post('/api/products', (req, res) => {
  const { name, description, price, image } = req.body;
  db.run('INSERT INTO products (name, description, price, image) VALUES (?, ?, ?, ?)', [name, description, price, image],
    function (err) {
      if (err) res.status(500).json({ error: err });
      else res.json({ id: this.lastID });
    });
});

app.post('/api/orders', (req, res) => {
  const { customer_name, customer_email, cart } = req.body;
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  db.run('INSERT INTO orders (customer_name, customer_email, total) VALUES (?, ?, ?)', [customer_name, customer_email, total],
    function (err) {
      if (err) res.status(500).json({ error: err });
      else {
        const orderId = this.lastID;
        cart.forEach(item => {
          db.run('INSERT INTO order_items (order_id, product_id, quantity) VALUES (?, ?, ?)', [orderId, item.id, item.quantity]);
        });
        res.json({ orderId });
      }
    });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
