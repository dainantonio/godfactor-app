const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const routes = require('./routes');
const database = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api', routes);

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

database.initialize().then(() => {
    app.listen(PORT, () => {
        console.log(`GodFactor server running on port ${PORT}`);
        console.log(`Access at: http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});
