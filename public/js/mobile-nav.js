// MOBILE NAVIGATION

// Mobile Menu Toggle
const initMobileMenu = () => {
    const menuBtn = document.getElementById('mobileMenuBtn');
    const menu = document.getElementById('mobileMenu');
    const logoutBtnMobile = document.getElementById('logoutBtnMobile');
    const adminLinkMobile = document.getElementById('adminLinkMobile');
    
    if (!menuBtn || !menu) return;
    
    // Toggle menu
    menuBtn.addEventListener('click', () => {
        menuBtn.classList.toggle('active');
        menu.classList.toggle('hidden');
        document.body.style.overflow = menu.classList.contains('hidden') ? '' : 'hidden';
    });
    
    // Close menu when clicking a link
    const navLinks = document.querySelectorAll('.mobile-nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.id !== 'logoutBtnMobile') {
                menuBtn.classList.remove('active');
                menu.classList.add('hidden');
                document.body.style.overflow = '';
            }
        });
    });
    
    // Close menu when clicking outside
    menu.addEventListener('click', (e) => {
        if (e.target === menu) {
            menuBtn.classList.remove('active');
            menu.classList.add('hidden');
            document.body.style.overflow = '';
        }
    });
    
    // Update user info in mobile menu
    const updateMobileUserInfo = () => {
        const userData = localStorage.getItem('evote_user');
        const user = userData ? JSON.parse(userData) : null;
        
        if (user) {
            const nameEl = document.getElementById('mobileUserName');
            const avatarEl = document.getElementById('mobileUserAvatar');
            const walletEl = document.getElementById('mobileUserWallet');
            
            if (nameEl) nameEl.textContent = user.name || 'User';
            if (avatarEl) avatarEl.textContent = user.name ? user.name.charAt(0).toUpperCase() : 'U';
            if (walletEl && user.walletAddress) {
                walletEl.textContent = `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`;
            } else if (walletEl) {
                walletEl.textContent = 'Not Connected';
            }
            
            // Show/hide admin link
            if (adminLinkMobile) {
                adminLinkMobile.style.display = user.role === 'admin' ? 'flex' : 'none';
            }
        }
    };
    
    updateMobileUserInfo();
    
    // Logout from mobile menu
    if (logoutBtnMobile) {
        logoutBtnMobile.addEventListener('click', () => {
            localStorage.removeItem('evote_token');
            localStorage.removeItem('evote_user');
            window.location.href = 'login.html';
        });
    }
};

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileMenu);
} else {
    initMobileMenu();
}