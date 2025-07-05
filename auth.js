// auth.js - Client-side authentication handling

// Authentication state management
const authManager = {
    user: null,
    isAuthenticated: false,
    
    // Initialize authentication
    init: function() {
        this.checkAuthStatus();
        this.setupEventListeners();
    },
    
    // Check current authentication status
    checkAuthStatus: async function() {
        try {
            const response = await fetch('/api/auth/status');
            const data = await response.json();
            
            if (data.authenticated) {
                this.setUser(data.user);
                this.updateUI();
            } else {
                // User is not authenticated, redirect to login
                window.location.href = '/login';
            }
        } catch (error) {
            console.error('Auth status check failed:', error);
            // On error, redirect to login
            window.location.href = '/login';
        }
    },
    
    // Set user data
    setUser: function(user) {
        this.user = user;
        this.isAuthenticated = true;
        console.log('User authenticated:', user);
    },
    
    // Update UI with user information
    updateUI: function() {
        if (this.user) {
            const usernameEl = document.getElementById('username');
            if (usernameEl) {
                usernameEl.textContent = this.user.username;
            }
            
            // Show user info bar
            const userInfoBar = document.querySelector('.user-info-bar');
            if (userInfoBar) {
                userInfoBar.style.display = 'flex';
            }
        }
    },
    
    // Handle logout
    logout: async function() {
        try {
            // Show confirmation dialog
            const confirmed = confirm('Are you sure you want to logout?');
            if (!confirmed) return;
            
            // Disable logout button temporarily
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.disabled = true;
                logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            }
            
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                console.log('Logout successful');
                // Clear user data
                this.user = null;
                this.isAuthenticated = false;
                
                // Clear any cached data
                localStorage.clear();
                sessionStorage.clear();
                
                // Redirect to login page
                window.location.href = '/login';
            } else {
                console.error('Logout failed:', data.error);
                alert('Logout failed. Please try again.');
            }
        } catch (error) {
            console.error('Logout error:', error);
            alert('Logout failed. Please try again.');
        } finally {
            // Re-enable logout button
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.disabled = false;
                logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i>';
            }
        }
    },
    
    // Setup event listeners
    setupEventListeners: function() {
        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
        
        // Handle session expiration on API calls
        this.interceptAPIRequests();
    },
    
    // Intercept API requests to handle authentication errors
    interceptAPIRequests: function() {
        // Store original fetch
        const originalFetch = window.fetch;
        
        // Override fetch to handle auth errors
        window.fetch = async function(url, options = {}) {
            try {
                const response = await originalFetch(url, options);
                
                // Check for authentication errors
                if (response.status === 401) {
                    console.log('Authentication required, redirecting to login');
                    // Clear user data
                    authManager.user = null;
                    authManager.isAuthenticated = false;
                    
                    // Show user-friendly message
                    alert('Your session has expired. Please log in again.');
                    
                    // Redirect to login
                    window.location.href = '/login';
                    return;
                }
                
                return response;
            } catch (error) {
                console.error('API request failed:', error);
                throw error;
            }
        };
    },
    
    // Get current user info
    getUser: function() {
        return this.user;
    },
    
    // Check if user is authenticated
    isUserAuthenticated: function() {
        return this.isAuthenticated;
    }
};

// Enhanced error handling for the main app
const enhancedErrorHandler = {
    // Handle API errors with user-friendly messages
    handleAPIError: function(error, context = '') {
        console.error(`API Error ${context}:`, error);
        
        // Check if it's an authentication error
        if (error.message && error.message.includes('401')) {
            authManager.logout();
            return;
        }
        
        // Show user-friendly error message
        let message = 'Something went wrong. Please try again.';
        
        if (context.includes('chat')) {
            message = 'Failed to send message. Please check your connection and try again.';
        } else if (context.includes('voice')) {
            message = 'Voice feature is currently unavailable. Please try again later.';
        } else if (context.includes('settings')) {
            message = 'Failed to save settings. Please try again.';
        }
        
        this.showErrorNotification(message);
    },
    
    // Show error notification to user
    showErrorNotification: function(message, duration = 5000) {
        // Remove any existing notifications
        const existingNotification = document.querySelector('.error-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-exclamation-triangle"></i>
                <span>${message}</span>
                <button class="notification-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Setup close button
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.remove();
        });
        
        // Auto-remove after duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);
        
        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
    },
    
    // Show success notification
    showSuccessNotification: function(message, duration = 3000) {
        // Remove any existing notifications
        const existingNotification = document.querySelector('.success-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'success-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-check-circle"></i>
                <span>${message}</span>
                <button class="notification-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Setup close button
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.remove();
        });
        
        // Auto-remove after duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);
        
        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
    }
};

// Initialize authentication when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing authentication...');
    authManager.init();
});

// Export for use in other scripts
window.authManager = authManager;
window.enhancedErrorHandler = enhancedErrorHandler;