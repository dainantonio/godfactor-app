class GodFactorApp {
    constructor() {
        this.currentUser = null;
        this.apiBaseUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:3000/api' 
            : '/api';
        
        this.initializeApp();
    }

    initializeApp() {
        this.setupEventListeners();
        this.checkAuthStatus();
        this.loadInitialContent();
    }

    setupEventListeners() {
        document.getElementById('loginBtn').addEventListener('click', () => this.showModal('loginModal'));
        document.getElementById('signupBtn').addEventListener('click', () => this.showModal('signupModal'));
        document.getElementById('ctaBtn').addEventListener('click', () => this.showModal('signupModal'));
        
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideAllModals();
                }
            });
        });

        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('signupForm').addEventListener('submit', (e) => this.handleSignup(e));
        document.getElementById('testimonyForm').addEventListener('submit', (e) => this.handleTestimonySubmit(e));
        
        document.getElementById('switchToSignup').addEventListener('click', (e) => {
            e.preventDefault();
            this.hideAllModals();
            this.showModal('signupModal');
        });

        document.getElementById('shareTestimonyBtn').addEventListener('click', () => {
            if (this.currentUser) {
                this.showModal('testimonyModal');
            } else {
                this.showModal('loginModal');
            }
        });

        document.getElementById('submitPost').addEventListener('click', () => this.submitFaithPost());
        document.getElementById('submitPrayer').addEventListener('click', () => this.submitPrayerRequest());

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('response-btn')) {
                this.handlePostResponse(e.target);
            }
            if (e.target.classList.contains('praying-btn')) {
                this.handlePrayerResponse(e.target);
            }
        });
    }

    async checkAuthStatus() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/status`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const user = await response.json();
                this.currentUser = user;
                this.updateUIForAuthState();
            }
        } catch (error) {
            console.log('Not authenticated');
        }
    }

    updateUIForAuthState() {
        if (this.currentUser) {
            document.getElementById('postControls').classList.remove('hidden');
            const authButtons = document.querySelector('.auth-buttons');
            authButtons.innerHTML = `
                <span class="welcome">Welcome, ${this.currentUser.name.split(' ')[0]}</span>
                <button id="logoutBtn" class="btn-secondary">Sign Out</button>
            `;
            document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                const user = await response.json();
                this.currentUser = user;
                this.updateUIForAuthState();
                this.hideAllModals();
                this.showNotification('Welcome back!', 'success');
                this.loadInitialContent();
            } else {
                this.showNotification('Invalid email or password', 'error');
            }
        } catch (error) {
            this.showNotification('Login failed. Please try again.', 'error');
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const agreeCovenant = document.getElementById('agreeCovenant').checked;

        if (!agreeCovenant) {
            this.showNotification('Please agree to the Community Covenant', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name, email, password })
            });

            if (response.ok) {
                const user = await response.json();
                this.currentUser = user;
                this.updateUIForAuthState();
                this.hideAllModals();
                this.showNotification('Account created successfully!', 'success');
                this.loadInitialContent();
            } else {
                const error = await response.json();
                this.showNotification(error.message || 'Signup failed', 'error');
            }
        } catch (error) {
            this.showNotification('Signup failed. Please try again.', 'error');
        }
    }

    async handleLogout() {
        try {
            await fetch(`${this.apiBaseUrl}/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            this.currentUser = null;
            location.reload();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }

    async loadInitialContent() {
        await Promise.all([
            this.loadTodayDevotional(),
            this.loadFaithFeed(),
            this.loadTestimonies(),
            this.loadPrayerRequests()
        ]);
    }

    async loadTodayDevotional() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/devotionals/today`);
            const devotional = await response.json();
            const container = document.getElementById('todayDevotional');
            if (devotional) {
                container.innerHTML = `
                    <h3>${devotional.title}</h3>
                    <div class="date">${new Date(devotional.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}</div>
                    <div class="scripture">
                        <strong>Scripture:</strong> ${devotional.scripture}
                    </div>
                    <div class="reflection">
                        <span class="label">Reflection:</span>
                        ${devotional.reflection}
                    </div>
                    <div class="prayer">
                        <span class="label">Prayer:</span>
                        ${devotional.prayer}
                    </div>
                    <div class="action">
                        <span class="label">Action Step:</span>
                        ${devotional.action_step}
                    </div>
                `;
            } else {
                container.innerHTML = '<p>No devotional for today. Check back tomorrow!</p>';
            }
        } catch (error) {
            console.error('Failed to load devotional:', error);
        }
    }

    async loadFaithFeed() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/posts`);
            const posts = await response.json();
            const container = document.getElementById('faithFeed');
            container.innerHTML = posts.map(post => `
                <div class="feed-post" data-post-id="${post.id}">
                    <div class="post-content">
                        <p>${this.escapeHtml(post.content)}</p>
                    </div>
                    <div class="post-meta">
                        <span class="post-author">${post.anonymous ? 'Anonymous' : post.user_name}</span>
                        <span class="post-time">${this.timeAgo(new Date(post.created_at))}</span>
                    </div>
                    <div class="post-responses">
                        <button class="response-btn" data-response="praying">🙏 Praying</button>
                        <button class="response-btn" data-response="amen">🙌 Amen</button>
                        <button class="response-btn" data-response="thankyou">✨ Thank You, Lord</button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Failed to load faith feed:', error);
        }
    }

    async loadTestimonies() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/testimonies/approved`);
            const testimonies = await response.json();
            const container = document.getElementById('testimoniesList');
            container.innerHTML = testimonies.map(testimony => `
                <div class="testimony-card">
                    <h3>${this.escapeHtml(testimony.title)}</h3>
                    <p>${this.escapeHtml(testimony.content)}</p>
                    <div class="testimony-meta">
                        <span class="category">${testimony.category.charAt(0).toUpperCase() + testimony.category.slice(1)}</span>
                        <span class="date">${new Date(testimony.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Failed to load testimonies:', error);
        }
    }

    async loadPrayerRequests() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/prayers`);
            const prayers = await response.json();
            const container = document.getElementById('prayerRequests');
            container.innerHTML = prayers.map(prayer => `
                <div class="prayer-card" data-prayer-id="${prayer.id}">
                    <p class="prayer-text">${this.escapeHtml(prayer.content)}</p>
                    <div class="prayer-meta">
                        <button class="praying-btn">🙏 I'm Praying</button>
                        <span class="prayer-count">${prayer.prayer_count} praying</span>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Failed to load prayer requests:', error);
        }
    }

    async submitFaithPost() {
        if (!this.currentUser) {
            this.showModal('loginModal');
            return;
        }

        const content = document.getElementById('postInput').value.trim();
        if (!content) {
            this.showNotification('Please write something to share', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ content })
            });

            if (response.ok) {
                document.getElementById('postInput').value = '';
                this.showNotification('Post shared successfully!', 'success');
                this.loadFaithFeed();
            } else {
                this.showNotification('Failed to share post', 'error');
            }
        } catch (error) {
            this.showNotification('Failed to share post', 'error');
        }
    }

    async submitPrayerRequest() {
        if (!this.currentUser) {
            this.showModal('loginModal');
            return;
        }

        const content = document.getElementById('prayerInput').value.trim();
        if (!content) {
            this.showNotification('Please share your prayer need', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/prayers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ content })
            });

            if (response.ok) {
                document.getElementById('prayerInput').value = '';
                this.showNotification('Prayer request submitted', 'success');
                this.loadPrayerRequests();
            } else {
                this.showNotification('Failed to submit prayer request', 'error');
            }
        } catch (error) {
            this.showNotification('Failed to submit prayer request', 'error');
        }
    }

    async handleTestimonySubmit(e) {
        e.preventDefault();
        if (!this.currentUser) {
            this.showModal('loginModal');
            return;
        }

        const title = document.getElementById('testimonyTitle').value.trim();
        const category = document.getElementById('testimonyCategory').value;
        const content = document.getElementById('testimonyContent').value.trim();
        const anonymous = document.getElementById('testimonyAnonymous').checked;

        if (!title || !category || !content) {
            this.showNotification('Please fill all required fields', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/testimonies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ title, category, content, anonymous })
            });

            if (response.ok) {
                this.hideAllModals();
                document.getElementById('testimonyForm').reset();
                this.showNotification('Testimony submitted for review!', 'success');
                this.loadTestimonies();
            } else {
                this.showNotification('Failed to submit testimony', 'error');
            }
        } catch (error) {
            this.showNotification('Failed to submit testimony', 'error');
        }
    }

    async handlePostResponse(button) {
        if (!this.currentUser) {
            this.showModal('loginModal');
            return;
        }

        const postId = button.closest('.feed-post').dataset.postId;
        const responseType = button.dataset.response;

        try {
            const response = await fetch(`${this.apiBaseUrl}/posts/${postId}/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ response_type: responseType })
            });

            if (response.ok) {
                this.showNotification('Response recorded', 'success');
                button.textContent = '✓ ' + button.textContent;
                button.disabled = true;
            }
        } catch (error) {
            this.showNotification('Failed to record response', 'error');
        }
    }

    async handlePrayerResponse(button) {
        if (!this.currentUser) {
            this.showModal('loginModal');
            return;
        }

        const prayerId = button.closest('.prayer-card').dataset.prayerId;

        try {
            const response = await fetch(`${this.apiBaseUrl}/prayers/${prayerId}/pray`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                button.textContent = '✓ Praying';
                button.disabled = true;
                button.nextElementSibling.textContent = `${data.new_count} praying`;
                this.showNotification('Prayer recorded. Thank you!', 'success');
            }
        } catch (error) {
            this.showNotification('Failed to record prayer', 'error');
        }
    }

    showModal(modalId) {
        document.getElementById(modalId).classList.remove('hidden');
    }

    hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
    }

    showNotification(message, type) {
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: var(--border-radius);
            background: ${type === 'success' ? '#4CAF50' : '#E74C3C'};
            color: white;
            z-index: 3000;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    timeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60,
            second: 1
        };

        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
            }
        }
        return 'just now';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new GodFactorApp();
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
});
