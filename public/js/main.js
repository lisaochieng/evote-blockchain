// HERO ANIMATIONS

// Sample transaction data for the live feed
const sampleTransactions = [
    { hash: '0x7a9f...3b2c', action: 'Vote Cast', time: '2s ago' },
    { hash: '0x3e5d...8f1a', action: 'Vote Cast', time: '5s ago' },
    { hash: '0xb4c2...9d7e', action: 'Vote Cast', time: '8s ago' },
    { hash: '0x1f8a...4c5b', action: 'Vote Cast', time: '12s ago' },
    { hash: '0x9c3d...2e8f', action: 'Vote Cast', time: '15s ago' },
    { hash: '0x6d2a...7f9c', action: 'Vote Cast', time: '18s ago' },
    { hash: '0x4b8e...1a3d', action: 'Vote Cast', time: '22s ago' },
    { hash: '0x8f5c...6e2b', action: 'Vote Cast', time: '25s ago' },
];

// Generate random hash
const generateHash = () => {
    const chars = '0123456789abcdef';
    let hash = '0x';
    for (let i = 0; i < 4; i++) {
        hash += chars[Math.floor(Math.random() * chars.length)];
    }
    hash += '...';
    for (let i = 0; i < 4; i++) {
        hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
};

// Live feed animation
const initLiveFeed = () => {
    const feedContainer = document.getElementById('liveFeed');
    if (!feedContainer) return;

    let transactionIndex = 0;

    const addTransaction = () => {
        const newTx = {
            hash: generateHash(),
            action: 'Vote Cast',
            time: 'now'
        };

        const feedItem = document.createElement('div');
        feedItem.className = 'feed-item';
        feedItem.innerHTML = `
            <span class="feed-hash">${newTx.hash}</span>
            <span class="feed-action">${newTx.action}</span>
            <span class="feed-time">${newTx.time}</span>
        `;

        // Insert at the top
        feedContainer.insertBefore(feedItem, feedContainer.firstChild);

        // Update times on existing items
        const items = feedContainer.querySelectorAll('.feed-item');
        items.forEach((item, index) => {
            if (index > 0) {
                const timeSpan = item.querySelector('.feed-time');
                const seconds = index * 3;
                timeSpan.textContent = `${seconds}s ago`;
            }
        });

        // Keep only 3 items visible
        while (feedContainer.children.length > 3) {
            feedContainer.removeChild(feedContainer.lastChild);
        }
    };

    // Add initial transactions
    sampleTransactions.slice(0, 2).forEach((tx, index) => {
        setTimeout(() => {
            const feedItem = document.createElement('div');
            feedItem.className = 'feed-item';
            feedItem.innerHTML = `
                <span class="feed-hash">${tx.hash}</span>
                <span class="feed-action">${tx.action}</span>
                <span class="feed-time">${tx.time}</span>
            `;
            feedContainer.appendChild(feedItem);
        }, index * 500);
    });

    // Add new transactions periodically
    setInterval(addTransaction, 4000);
};

// Animate vote counts on blocks
const initVoteCounters = () => {
    const voteCounters = document.querySelectorAll('.vote-count:not(.live)');
    
    voteCounters.forEach(counter => {
        const finalValue = parseInt(counter.textContent);
        if (isNaN(finalValue)) return;
        
        let currentValue = 0;
        const increment = Math.ceil(finalValue / 30);
        const duration = 1500;
        const stepTime = duration / (finalValue / increment);
        
        const animate = () => {
            currentValue += increment;
            if (currentValue >= finalValue) {
                counter.textContent = finalValue;
            } else {
                counter.textContent = currentValue;
                setTimeout(animate, stepTime);
            }
        };
        
        // Start animation when element is in view
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animate();
                    observer.unobserve(entry.target);
                }
            });
        });
        
        observer.observe(counter);
    });
};

// Block hover effects
const initBlockHoverEffects = () => {
    const blocks = document.querySelectorAll('.grid-block');
    
    blocks.forEach(block => {
        block.addEventListener('mouseenter', () => {
            // Add ripple effect
            const pulse = block.querySelector('.block-pulse');
            if (pulse) {
                pulse.classList.add('active');
                setTimeout(() => {
                    pulse.classList.remove('active');
                }, 600);
            }
        });
    });
};

// Animate live vote count on active block
const initLiveVoteAnimation = () => {
    const liveCount = document.querySelector('.vote-count.live');
    if (!liveCount) return;

    let count = 3;
    setInterval(() => {
        count = Math.floor(Math.random() * 5) + 1;
        liveCount.textContent = `+${count}`;
        liveCount.style.transform = 'scale(1.2)';
        setTimeout(() => {
            liveCount.style.transform = 'scale(1)';
        }, 200);
    }, 3000);
};

// Smooth scroll for navigation links
const initSmoothScroll = () => {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
};

// Navbar background on scroll
const initNavbarScroll = () => {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(10, 14, 39, 0.95)';
            navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
        } else {
            navbar.style.background = 'rgba(10, 14, 39, 0.8)';
            navbar.style.boxShadow = 'none';
        }
    });
};

// Parallax effect on hero
const initParallax = () => {
    const heroVisual = document.querySelector('.hero-visual');
    if (!heroVisual) return;

    window.addEventListener('mousemove', (e) => {
        const x = (window.innerWidth / 2 - e.pageX) / 50;
        const y = (window.innerHeight / 2 - e.pageY) / 50;
        
        heroVisual.style.transform = `translateX(${x}px) translateY(${y}px)`;
    });
};

// Feature cards animation on scroll
const initScrollAnimations = () => {
    const animatedElements = document.querySelectorAll('.feature-card, .step, .stat-item');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.1
    });

    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
};

// Initialize all animations
document.addEventListener('DOMContentLoaded', () => {
initLiveFeed();
    initVoteCounters();
    initBlockHoverEffects();
    initLiveVoteAnimation();
    initSmoothScroll();
    initNavbarScroll();
    initParallax();
    initScrollAnimations();
});