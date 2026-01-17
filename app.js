// DOM Elements
const pages = document.querySelectorAll('.page');
const navLinks = document.querySelectorAll('.nav-links li');
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinksContainer = document.querySelector('.nav-links');
const modal = document.getElementById('write-modal');
const toast = document.getElementById('toast');

// Icons as strings for reuse (Optimized)
const ICONS = {
    user: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
};

let currentPosts = [];

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    loadContent();
});

function initNavigation() {
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const target = link.getAttribute('data-target');
            navigateTo(target);
            if (window.innerWidth <= 768) {
                navLinksContainer.classList.remove('active');
            }
        });
    });

    mobileMenuBtn.addEventListener('click', () => {
        navLinksContainer.classList.toggle('active');
    });

    document.querySelector('.close-modal').addEventListener('click', () => {
        modal.classList.remove('show');
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('show');
    });

    document.getElementById('signup-form').addEventListener('submit', (e) => {
        e.preventDefault();
        showToast('가입 신청 완료!');
        e.target.reset();
    });

    document.getElementById('write-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const title = e.target.querySelector('input').value;
        const content = e.target.querySelector('textarea').value;
        addPost(title, content);
        modal.classList.remove('show');
        showToast('게시글 등록 완료');
        e.target.reset();
    });
}

function navigateTo(pageId) {
    navLinks.forEach(link => {
        if (link.getAttribute('data-target') === pageId) link.classList.add('active');
        else link.classList.remove('active');
    });
    pages.forEach(page => {
        if (page.id === pageId) page.classList.add('active');
        else page.classList.remove('active');
    });
    window.scrollTo(0, 0);
}

async function loadContent() {
    if (DEMO_MODE) {
        loadMockGallery();
        loadMockCommunity();
    }
}

function loadMockGallery() {
    const container = document.getElementById('gallery-container');
    container.innerHTML = '';
    // Use smaller image sizes for faster loading (300x300)
    const images = [
        { url: 'https://picsum.photos/300/300?random=1', title: '체육대회' },
        { url: 'https://picsum.photos/300/300?random=2', title: '현장학습' },
        { url: 'https://picsum.photos/300/300?random=3', title: '급식실' },
        { url: 'https://picsum.photos/300/300?random=4', title: '쉬는 시간' },
        { url: 'https://picsum.photos/300/300?random=5', title: '과학실' },
        { url: 'https://picsum.photos/300/300?random=6', title: '방과후' }
    ];
    images.forEach(img => {
        const div = document.createElement('div');
        div.className = 'gallery-item';
        // Add loading="lazy" for performance
        div.innerHTML = `
            <img src="${img.url}" alt="${img.title}" loading="lazy">
            <div class="gallery-overlay"><h4>${img.title}</h4></div>
        `;
        container.appendChild(div);
    });
}

function loadMockCommunity() {
    const container = document.getElementById('community-container');
    if (currentPosts.length === 0) {
        currentPosts = [
            { id: 1, title: '이번 주 주번 공지', author: '김철수', date: '2026-03-15', content: '칠판 지우개 확인하자.' },
            { id: 2, title: '수학 숙제 질문', author: '이영희', date: '2026-03-14', content: '34페이지 5번 문제.' },
            { id: 3, title: '체육복 챙기기', author: '반장', date: '2026-03-13', content: '내일 잊지마!' }
        ];
    }
    renderPosts();
}

function renderPosts() {
    const container = document.getElementById('community-container');
    container.innerHTML = '';
    if (currentPosts.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>게시글이 없습니다.</p></div>';
        return;
    }
    currentPosts.forEach(post => {
        const div = document.createElement('div');
        div.className = 'community-item';
        div.innerHTML = `
            <h4>${post.title}</h4>
            <div class="meta">
                <span>${ICONS.user} ${post.author}</span> &bull; 
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
        author: '익명',
        date: new Date().toISOString().split('T')[0],
        content: content
    };
    currentPosts.unshift(newPost);
    renderPosts();
}

function openWriteModal() {
    modal.classList.add('show');
}

function showToast(message) {
    const msgEl = document.getElementById('toast-message');
    msgEl.textContent = message;
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
}
