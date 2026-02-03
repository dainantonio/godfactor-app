const express = require('express');
const auth = require('./auth');
const database = require('./database');
const router = express.Router();

const requireAuth = async (req, res, next) => {
    const token = req.cookies.session_token;
    if (!token) return res.status(401).json({ message: 'Authentication required' });
    const userId = auth.verifySessionToken(token);
    if (!userId) return res.status(401).json({ message: 'Invalid or expired session' });
    const user = await auth.getUserById(userId);
    if (!user) return res.status(401).json({ message: 'User not found' });
    req.user = user;
    next();
};

const requireAdmin = async (req, res, next) => {
    const isAdmin = await auth.isAdmin(req.user.id);
    if (!isAdmin) return res.status(403).json({ message: 'Admin access required' });
    next();
};

router.post('/auth/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }
        const user = await auth.createUser(name, email, password);
        const token = auth.createSessionToken(user.id);
        res.cookie('session_token', token, {
            httpOnly: true,
            maxAge: 30 * 24 * 60 * 60 * 1000,
            sameSite: 'strict'
        });
        res.json(user);
    } catch (error) {
        if (error.message === 'User already exists') {
            res.status(409).json({ message: 'Email already registered' });
        } else {
            res.status(500).json({ message: 'Registration failed' });
        }
    }
});

router.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password required' });
        }
        const user = await auth.authenticateUser(email, password);
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });
        const token = auth.createSessionToken(user.id);
        res.cookie('session_token', token, {
            httpOnly: true,
            maxAge: 30 * 24 * 60 * 60 * 1000,
            sameSite: 'strict'
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Login failed' });
    }
});

router.post('/auth/logout', (req, res) => {
    res.clearCookie('session_token');
    res.json({ message: 'Logged out successfully' });
});

router.get('/auth/status', requireAuth, (req, res) => {
    res.json(req.user);
});

router.get('/devotionals/today', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const devotional = await database.getQuery(
            "SELECT * FROM devotionals WHERE date = ? ORDER BY date DESC LIMIT 1",
            [today]
        );
        if (!devotional) {
            const recentDevotional = await database.getQuery(
                "SELECT * FROM devotionals ORDER BY date DESC LIMIT 1"
            );
            res.json(recentDevotional);
        } else {
            res.json(devotional);
        }
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch devotional' });
    }
});

router.get('/devotionals', async (req, res) => {
    try {
        const devotionals = await database.allQuery(
            "SELECT * FROM devotionals ORDER BY date DESC LIMIT 30"
        );
        res.json(devotionals);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch devotionals' });
    }
});

router.post('/devotionals', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { title, scripture, reflection, prayer, action_step, date } = req.body;
        await database.runQuery(
            `INSERT INTO devotionals (title, scripture, reflection, prayer, action_step, date) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [title, scripture, reflection, prayer, action_step, date]
        );
        res.json({ message: 'Devotional created successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to create devotional' });
    }
});

router.get('/posts', async (req, res) => {
    try {
        const posts = await database.allQuery(`
            SELECT p.*, u.name as user_name 
            FROM posts p 
            JOIN users u ON p.user_id = u.id 
            ORDER BY p.created_at DESC 
            LIMIT 50
        `);
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch posts' });
    }
});

router.post('/posts', requireAuth, async (req, res) => {
    try {
        const { content, anonymous = false } = req.body;
        if (!content || content.trim().length === 0) {
            return res.status(400).json({ message: 'Post content required' });
        }
        if (content.length > 500) {
            return res.status(400).json({ message: 'Post too long (max 500 characters)' });
        }
        await database.runQuery(
            "INSERT INTO posts (user_id, content, anonymous) VALUES (?, ?, ?)",
            [req.user.id, content.trim(), anonymous ? 1 : 0]
        );
        res.json({ message: 'Post created successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to create post' });
    }
});

router.post('/posts/:id/respond', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { response_type } = req.body;
        if (!['praying', 'amen', 'thankyou'].includes(response_type)) {
            return res.status(400).json({ message: 'Invalid response type' });
        }
        const existing = await database.getQuery(
            "SELECT id FROM post_responses WHERE post_id = ? AND user_id = ?",
            [id, req.user.id]
        );
        if (existing) {
            return res.status(400).json({ message: 'Already responded to this post' });
        }
        await database.runQuery(
            "INSERT INTO post_responses (post_id, user_id, response_type) VALUES (?, ?, ?)",
            [id, req.user.id, response_type]
        );
        res.json({ message: 'Response recorded' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to record response' });
    }
});

router.get('/testimonies/approved', async (req, res) => {
    try {
        const testimonies = await database.allQuery(`
            SELECT t.*, u.name as user_name 
            FROM testimonies t 
            LEFT JOIN users u ON t.user_id = u.id 
            WHERE t.approved = 1 
            ORDER BY t.approved_at DESC 
            LIMIT 20
        `);
        res.json(testimonies);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch testimonies' });
    }
});

router.post('/testimonies', requireAuth, async (req, res) => {
    try {
        const { title, content, category, anonymous = false } = req.body;
        if (!title || !content || !category) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        if (!['salvation', 'healing', 'provision', 'peace', 'deliverance', 'other'].includes(category)) {
            return res.status(400).json({ message: 'Invalid category' });
        }
        await database.runQuery(
            `INSERT INTO testimonies (user_id, title, content, category, anonymous) 
             VALUES (?, ?, ?, ?, ?)`,
            [req.user.id, title.trim(), content.trim(), category, anonymous ? 1 : 0]
        );
        res.json({ message: 'Testimony submitted for review' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to submit testimony' });
    }
});

router.get('/prayers', async (req, res) => {
    try {
        const prayers = await database.allQuery(`
            SELECT p.*, u.name as user_name 
            FROM prayers p 
            JOIN users u ON p.user_id = u.id 
            WHERE p.answered = 0 
            ORDER BY p.created_at DESC 
            LIMIT 20
        `);
        res.json(prayers);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch prayers' });
    }
});

router.post('/prayers', requireAuth, async (req, res) => {
    try {
        const { content } = req.body;
        if (!content || content.trim().length === 0) {
            return res.status(400).json({ message: 'Prayer content required' });
        }
        await database.runQuery(
            "INSERT INTO prayers (user_id, content) VALUES (?, ?)",
            [req.user.id, content.trim()]
        );
        res.json({ message: 'Prayer request submitted' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to submit prayer request' });
    }
});

router.post('/prayers/:id/pray', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await database.getQuery(
            "SELECT id FROM prayer_responses WHERE prayer_id = ? AND user_id = ?",
            [id, req.user.id]
        );
        if (existing) {
            return res.status(400).json({ message: 'Already praying for this request' });
        }
        await database.runQuery(
            "INSERT INTO prayer_responses (prayer_id, user_id) VALUES (?, ?)",
            [id, req.user.id]
        );
        await database.runQuery(
            "UPDATE prayers SET prayer_count = prayer_count + 1 WHERE id = ?",
            [id]
        );
        const updated = await database.getQuery(
            "SELECT prayer_count FROM prayers WHERE id = ?",
            [id]
        );
        res.json({ message: 'Prayer recorded', new_count: updated.prayer_count });
    } catch (error) {
        res.status(500).json({ message: 'Failed to record prayer' });
    }
});

router.get('/admin/testimonies/pending', requireAuth, requireAdmin, async (req, res) => {
    try {
        const testimonies = await database.allQuery(`
            SELECT t.*, u.name as user_name, u.email 
            FROM testimonies t 
            JOIN users u ON t.user_id = u.id 
            WHERE t.approved = 0 
            ORDER BY t.created_at DESC
        `);
        res.json(testimonies);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch pending testimonies' });
    }
});

router.post('/admin/testimonies/:id/approve', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await database.runQuery(
            "UPDATE testimonies SET approved = 1, approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?",
            [req.user.id, id]
        );
        res.json({ message: 'Testimony approved' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to approve testimony' });
    }
});

router.post('/admin/testimonies/:id/reject', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        await database.runQuery("DELETE FROM testimonies WHERE id = ?", [id]);
        res.json({ message: 'Testimony rejected' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to reject testimony' });
    }
});

module.exports = router;
