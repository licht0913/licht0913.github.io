// DOM Elements
const pages = document.querySelectorAll('.page');
const navLinks = document.querySelectorAll('.nav-links li');
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinksContainer = document.querySelector('.nav-links');
const modal = document.getElementById('write-modal');
const toast = document.getElementById('toast');

// State
let currentPosts = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    loadContent();
});

// Navigation Logic
function initNavigation() {
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const target = link.getAttribute('data-target');
            navigateTo(target);
            // Mobile menu close
            if (window.innerWidth <= 768) {
                navLinksContainer.classList.remove('active');
            }
        });
    });

    mobileMenuBtn.addEventListener('click', () => {
        navLinksContainer.classList.toggle('active');
    });

    // Modal Close
    document.querySelector('.close-modal').addEventListener('click', () => {
        modal.classList.remove('show');
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });

    // Form Submissions
    document.getElementById('signup-form').addEventListener('submit', (e) => {
        e.preventDefault();
        showToast('가입 신청이 완료되었습니다! (승인 대기중)');
        e.target.reset();
    });

    document.getElementById('write-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const title = e.target.querySelector('input').value;
        const content = e.target.querySelector('textarea').value;
        addPost(title, content);
        modal.classList.remove('show');
        showToast('게시글이 등록되었습니다.');
        e.target.reset();
    });
}

function navigateTo(pageId) {
    // Update Active Link
    navLinks.forEach(link => {
        if (link.getAttribute('data-target') === pageId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Show Page
    pages.forEach(page => {
        if (page.id === pageId) {
            page.classList.add('active');
        } else {
            page.classList.remove('active');
        }
    });

    // Scroll to top
    window.scrollTo(0, 0);
}

// Data Loading (Mock or Notion)
async function loadContent() {
    if (DEMO_MODE) {
        loadMockGallery();
        loadMockCommunity();
    } else {
        // Here you would implement actual Notion API calls
        console.log('Notion API connection required');
    }
}

function loadMockGallery() {
    const container = document.getElementById('gallery-container');
    container.innerHTML = '';

    const images = [
        { url: 'https://picsum.photos/400/400?random=1', title: '체육대회 우승!' },
        { url: 'https://picsum.photos/400/500?random=2', title: '현장학습 단체사진' },
        { url: 'https://picsum.photos/400/300?random=3', title: '급식실 가는 길' },
        { url: 'https://picsum.photos/400/400?random=4', title: '쉬는 시간 풍경' },
        { url: 'https://picsum.photos/400/600?random=5', title: '과학실 실험' },
        { url: 'https://picsum.photos/400/350?random=6', title: '여름방학 방과후' }
    ];

    images.forEach(img => {
        const div = document.createElement('div');
        div.className = 'gallery-item';
        div.innerHTML = `
            <img src="${img.url}" alt="${img.title}" loading="lazy">
            <div class="gallery-overlay">
                <h4>${img.title}</h4>
            </div>
        `;
        container.appendChild(div);
    });
}

function loadMockCommunity() {
    const container = document.getElementById('community-container');

    // Initial Mock Data
    if (currentPosts.length === 0) {
        currentPosts = [
            { id: 1, title: '이번 주 주번 누구니?', author: '김철수', date: '2026-03-15', content: '칠판 지우개 털어야 해.' },
            { id: 2, title: '수학 숙제 34페이지까지 맞지?', author: '이영희', date: '2026-03-14', content: '너무 어려워...' },
            { id: 3, title: '내일 체육복 가져와야 함!', author: '반장', date: '2026-03-13', content: '까먹지 말자 얘들아.' }
        ];
    }

    renderPosts();
}

function renderPosts() {
    const container = document.getElementById('community-container');
    container.innerHTML = '';

    if (currentPosts.length === 0) {
        container.innerHTML = '<div class="empty-state">게시글이 없습니다.</div>';
        return;
    }

    currentPosts.forEach(post => {
        const div = document.createElement('div');
        div.className = 'community-item';
        div.innerHTML = `
            <h4>${post.title}</h4>
            <div class="meta">
                <span><i class="fa-regular fa-user"></i> ${post.author}</span> &bull; 
                <span>${post.date}</span>
            </div>
            <p style="margin-top: 10px; color: var(--text-light); font-size: 0.95rem;">${post.content}</p>
        `;
        container.appendChild(div);
    });
}

function addPost(title, content) {
    const newPost = {
        id: Date.now(),
        title: title,
        author: '익명', // Real auth would provide this
        date: new Date().toISOString().split('T')[0],
        content: content
    };
    currentPosts.unshift(newPost);
    renderPosts();
}

// Helpers
function openWriteModal() {
    modal.classList.add('show');
}

function showToast(message) {
    const msgEl = document.getElementById('toast-message');
    msgEl.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
