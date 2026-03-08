// Auth UI Components

function createAuthModal() {
    const modalHTML = `
        <div id="authModal" class="auth-modal" style="display: none;">
            <div class="auth-modal-content">
                <span class="auth-close" onclick="closeAuthModal()">&times;</span>
                
                <div id="loginForm" class="auth-form">
                    <h2>Login to JanMitra</h2>
                    <form onsubmit="handleLogin(event)">
                        <input type="email" id="loginEmail" placeholder="Email" required>
                        <input type="password" id="loginPassword" placeholder="Password" required>
                        <button type="submit" class="auth-btn">Login</button>
                    </form>
                    <p>Don't have an account? <a href="#" onclick="showRegisterForm()">Register</a></p>
                </div>
                
                <div id="registerForm" class="auth-form" style="display: none;">
                    <h2>Register for JanMitra</h2>
                    <form onsubmit="handleRegister(event)">
                        <input type="text" id="registerName" placeholder="Full Name" required>
                        <input type="email" id="registerEmail" placeholder="Email" required>
                        <input type="tel" id="registerPhone" placeholder="Phone Number">
                        <input type="password" id="registerPassword" placeholder="Password (min 6 characters)" required minlength="6">
                        <button type="submit" class="auth-btn">Register</button>
                    </form>
                    <p>Already have an account? <a href="#" onclick="showLoginForm()">Login</a></p>
                </div>
                
                <div id="authMessage" class="auth-message"></div>
            </div>
        </div>
        
        <style>
            .auth-modal {
                position: fixed;
                z-index: 10000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .auth-modal-content {
                background: white;
                padding: 2rem;
                border-radius: 16px;
                max-width: 400px;
                width: 90%;
                position: relative;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            }
            
            .auth-close {
                position: absolute;
                right: 1rem;
                top: 1rem;
                font-size: 2rem;
                cursor: pointer;
                color: #6b7280;
            }
            
            .auth-form h2 {
                color: #1a2744;
                margin-bottom: 1.5rem;
                font-size: 1.5rem;
            }
            
            .auth-form input {
                width: 100%;
                padding: 0.75rem;
                margin-bottom: 1rem;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                font-size: 1rem;
            }
            
            .auth-form input:focus {
                outline: none;
                border-color: #e85d1a;
            }
            
            .auth-btn {
                width: 100%;
                padding: 0.75rem;
                background: #e85d1a;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.3s;
            }
            
            .auth-btn:hover {
                background: #c74d15;
            }
            
            .auth-form p {
                text-align: center;
                margin-top: 1rem;
                color: #6b7280;
            }
            
            .auth-form a {
                color: #e85d1a;
                text-decoration: none;
                font-weight: 600;
            }
            
            .auth-message {
                margin-top: 1rem;
                padding: 0.75rem;
                border-radius: 8px;
                text-align: center;
                display: none;
            }
            
            .auth-message.success {
                background: #f0f9f0;
                color: #2d6a2d;
                display: block;
            }
            
            .auth-message.error {
                background: #fee;
                color: #c00;
                display: block;
            }
        </style>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function showAuthModal() {
    document.getElementById('authModal').style.display = 'flex';
}

function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
    document.getElementById('authMessage').className = 'auth-message';
    document.getElementById('authMessage').textContent = '';
}

function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
}

function showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

function showAuthMessage(message, type) {
    const msgEl = document.getElementById('authMessage');
    msgEl.textContent = message;
    msgEl.className = `auth-message ${type}`;
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const result = await JanMitraAPI.Auth.login(email, password);
        showAuthMessage('Login successful! Redirecting...', 'success');
        setTimeout(() => {
            closeAuthModal();
            updateUIForLoggedInUser();
        }, 1000);
    } catch (error) {
        showAuthMessage(error.message || 'Login failed', 'error');
    }
}

async function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const phone = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;
    
    try {
        const result = await JanMitraAPI.Auth.register(name, email, password, phone);
        showAuthMessage('Registration successful! Welcome to JanMitra!', 'success');
        setTimeout(() => {
            closeAuthModal();
            updateUIForLoggedInUser();
        }, 1000);
    } catch (error) {
        showAuthMessage(error.message || 'Registration failed', 'error');
    }
}

function handleLogout() {
    JanMitraAPI.Auth.logout();
    updateUIForLoggedInUser();
    alert('Logged out successfully');
}

function updateUIForLoggedInUser() {
    const user = JanMitraAPI.getUser();
    const ctaButtons = document.querySelectorAll('.cta-button, .btn-primary');
    
    if (user) {
        ctaButtons.forEach(btn => {
            if (btn.textContent.includes('ASK JANMITRA') || btn.textContent.includes('Ask JanMitra')) {
                btn.textContent = `👋 ${user.name}`;
                btn.onclick = (e) => {
                    e.preventDefault();
                    if (confirm('Logout?')) handleLogout();
                };
            }
        });
    } else {
        ctaButtons.forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                showAuthModal();
            };
        });
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    createAuthModal();
    updateUIForLoggedInUser();
});
