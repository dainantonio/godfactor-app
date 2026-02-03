const bcrypt = require('bcrypt');
const database = require('./database');

const SESSION_SECRET = process.env.SESSION_SECRET || 'godfactor-secret-key-change-in-production';
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

class Auth {
    async authenticateUser(email, password) {
        try {
            const user = await database.getQuery(
                "SELECT id, name, email, password_hash, role FROM users WHERE email = ?",
                [email]
            );

            if (!user) return null;
            const isValid = await bcrypt.compare(password, user.password_hash);
            if (!isValid) return null;

            await database.runQuery(
                "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
                [user.id]
            );

            const { password_hash, ...userWithoutPassword } = user;
            return userWithoutPassword;
        } catch (error) {
            console.error('Authentication error:', error);
            return null;
        }
    }

    async createUser(name, email, password) {
        try {
            const existingUser = await database.getQuery(
                "SELECT id FROM users WHERE email = ?",
                [email]
            );
            if (existingUser) throw new Error('User already exists');

            const hashedPassword = await bcrypt.hash(password, 10);
            const result = await database.runQuery(
                "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
                [name, email, hashedPassword]
            );

            return {
                id: result.lastID,
                name,
                email,
                role: 'believer'
            };
        } catch (error) {
            console.error('User creation error:', error);
            throw error;
        }
    }

    async getUserById(userId) {
        try {
            const user = await database.getQuery(
                "SELECT id, name, email, role FROM users WHERE id = ?",
                [userId]
            );
            return user;
        } catch (error) {
            console.error('Get user error:', error);
            return null;
        }
    }

    async isAdmin(userId) {
        try {
            const user = await this.getUserById(userId);
            return user && user.role === 'admin';
        } catch (error) {
            return false;
        }
    }

    createSessionToken(userId) {
        return Buffer.from(`${userId}:${Date.now()}:${SESSION_SECRET}`).toString('base64');
    }

    verifySessionToken(token) {
        try {
            const decoded = Buffer.from(token, 'base64').toString('ascii');
            const [userId, timestamp, secret] = decoded.split(':');
            if (secret !== SESSION_SECRET) return null;
            const sessionAge = Date.now() - parseInt(timestamp);
            if (sessionAge > SESSION_MAX_AGE) return null;
            return parseInt(userId);
        } catch (error) {
            return null;
        }
    }
}

module.exports = new Auth();
