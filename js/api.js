// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Auth helpers
const getToken = () => localStorage.getItem('janmitra_token');
const setToken = (token) => localStorage.setItem('janmitra_token', token);
const removeToken = () => localStorage.removeItem('janmitra_token');
const getUser = () => JSON.parse(localStorage.getItem('janmitra_user') || 'null');
const setUser = (user) => localStorage.setItem('janmitra_user', JSON.stringify(user));
const removeUser = () => localStorage.removeItem('janmitra_user');

// API request helper
async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Auth API
const AuthAPI = {
    async register(name, email, password, phone) {
        const data = await apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password, phone })
        });
        setToken(data.token);
        setUser(data.user);
        return data;
    },
    
    async login(email, password) {
        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        setToken(data.token);
        setUser(data.user);
        return data;
    },
    
    async getProfile() {
        return await apiRequest('/auth/me');
    },
    
    async updateProfile(updates) {
        const data = await apiRequest('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
        setUser(data.user);
        return data;
    },
    
    logout() {
        removeToken();
        removeUser();
    },
    
    isAuthenticated() {
        return !!getToken();
    }
};

// Schemes API
const SchemesAPI = {
    async getAll() {
        return await apiRequest('/schemes');
    },
    
    async getByCategory(category) {
        return await apiRequest(`/schemes/category/${category}`);
    },
    
    async getById(id) {
        return await apiRequest(`/schemes/${id}`);
    },
    
    async search(query) {
        return await apiRequest('/schemes/search', {
            method: 'POST',
            body: JSON.stringify({ query })
        });
    }
};

// Eligibility API
const EligibilityAPI = {
    async check(schemeId, userProfile) {
        return await apiRequest('/eligibility/check', {
            method: 'POST',
            body: JSON.stringify({ schemeId, userProfile })
        });
    },
    
    async getCriteria(schemeId) {
        return await apiRequest(`/eligibility/${schemeId}`);
    }
};

// Documents API
const DocumentsAPI = {
    async getChecklist(schemeId) {
        return await apiRequest(`/documents/${schemeId}`);
    },
    
    async getProgress(schemeId) {
        return await apiRequest(`/documents/progress/${schemeId}`);
    },
    
    async updateProgress(schemeId, documentId, completed) {
        return await apiRequest('/documents/progress', {
            method: 'POST',
            body: JSON.stringify({ schemeId, documentId, completed })
        });
    }
};

// Chat API
const ChatAPI = {
    async sendMessage(message, context = {}) {
        return await apiRequest('/chat/message', {
            method: 'POST',
            body: JSON.stringify({ message, context })
        });
    }
};

// Export for use in HTML files
window.JanMitraAPI = {
    Auth: AuthAPI,
    Schemes: SchemesAPI,
    Eligibility: EligibilityAPI,
    Documents: DocumentsAPI,
    Chat: ChatAPI,
    getUser,
    getToken
};
