require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

// Load the env-based wallet if available
const { loadEnvWalletIfAvailable } = require('./services/walletService');
loadEnvWalletIfAvailable();

const app = express();

// EJS config
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Routes
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const walletRoutes = require('./routes/wallet');
const balanceRoutes = require('./routes/balance');
const todoRoutes = require('./routes/todo');

// [NEW ROUTES FOR DEPLOY & TRANSACTION STATUS]
const deployRoutes = require('./routes/deploy');
const transactionRoutes = require('./routes/transaction');

app.use('/', indexRoutes);
app.use('/', authRoutes);
app.use('/', walletRoutes);
app.use('/', balanceRoutes);
app.use('/', todoRoutes);
app.use('/', deployRoutes);
app.use('/', transactionRoutes);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
