// DOM Elements
const pages = document.querySelectorAll('.page');
const navLinks = document.querySelectorAll('.nav-links li');
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinksContainer = document.querySelector('.nav-links');
const modal = document.getElementById('write-modal');
const toast = document.getElementById('toast');

// Icons
const ICONS = {
    user: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
};

// State
let currentPosts = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    loadContent();

    // 모달창 열기 버튼 (안전하게 ID로 연결)
    const writeBtn = document.getElementById('btn-write');
    if (writeBtn) {
        writeBtn.addEventListener('click', openWriteModal);
    }
});

function initNavigation() {
    // Desktop Nav
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const targetId = link.getAttribute('data-target');
            navigateTo(targetId);
            if (window.innerWidth <= 768) {
                navLinksContainer.classList.remove('active');
            }
        });
    });

    // Mobile Menu
    mobileMenuBtn.addEventListener('click', () => {
        navLinksContainer.classList.toggle('active');
    });

    // Modal Close
    const closeBtn = document.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('show');
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });

    // Forms
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            showToast('가입 신청 완료!');
            e.target.reset();
        });
    }

    const writeForm = document.getElementById('write-form');
    if (writeForm) {
        writeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const author = document.getElementById('post-author').value;
            const title = document.getElementById('post-title').value;
            const content = document.getElementById('post-content').value;

            // ★ 수정됨: 여기서 그냥 바로 닫아버립니다! (await 제거)
            modal.classList.remove('show');
            showToast('게시글이 등록되었습니다!');
            e.target.reset();

            // 데이터 처리는 이제 백그라운드에서 혼자 돕니다.
            addPost(title, content, author);
        });
    }
}

function navigateTo(targetId) {
    navLinks.forEach(link => {
        if (link.getAttribute('data-target') === targetId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    pages.forEach(page => {
        if (page.id === targetId) {
            page.classList.add('active');
        } else {
            page.classList.remove('active');
        }
    });

    window.scrollTo(0, 0);
}

// ----------------------------------------------------
// Notion API Integration
// ----------------------------------------------------

// 헬퍼: 안전하게 값 꺼내기
function getProp(item, keys) {
    if (!item) return "";
    for (let key of keys) {
        let val = item[key];
        if (val) {
            // 제목/글쓴이(Text) 경우
            if (val.title && val.title.length > 0) return val.title[0].plain_text;
            if (val.rich_text && val.rich_text.length > 0) return val.rich_text[0].plain_text;
            // 날짜(Date) 경우
            if (val.date) return val.date.start;
            // 단순 문자열일 경우 (Optimistic Update용)
            if (typeof val === "string") return val;
        }
    }
    return ""; // 없으면 빈 문자열
}

async function loadContent() {
    try {
        const response = await fetch(CONFIG.API_URL);
        const data = await response.json();

        if (data.error) throw new Error(data.error);

        // 데이터 매핑
        const rawList = Array.isArray(data) ? data : (data.results || []);
        currentPosts = rawList.map(item => ({
            id: item.id,
            title: getProp(item.properties || item, ["Title", "title", "제목"]) || "제목 없음",
            content: getProp(item.properties || item, ["Content", "content", "내용"]) || "",
            author: getProp(item.properties || item, ["Author", "author", "글쓴이", "작성자"]) || "익명",
            date: getProp(item.properties || item, ["Date", "date", "날짜"]) || new Date().toISOString().split('T')[0]
        }));

        renderPosts();
    } catch (e) {
        console.error(e);
        loadMockCommunity();
    }
    loadMockGallery();
}

function loadMockGallery() {
    const galleryContainer = document.getElementById('gallery-container');
    if (!galleryContainer) return;

    galleryContainer.innerHTML = '';
    const images = [
        { url: 'https://picsum.photos/300/300?random=1', title: '체육대회' },
        { url: 'https://picsum.photos/300/300?random=2', title: '현장학습' },
        { url: 'https://picsum.photos/300/300?random=3', title: '급식실' },
        { url: 'https://picsum.photos/300/300?random=4', title: '쉬는 시간' },
        { url: 'https://picsum.photos/300/300?random=5', title: '과학실' },
        { url: 'https://picsum.photos/300/300?random=6', title: '방과후' }
    ];

    images.forEach(img => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.innerHTML = `
            <img src="${img.url}" alt="${img.title}" loading="lazy">
            <div class="gallery-overlay">
                <h4>${img.title}</h4>
            </div>
        `;
        galleryContainer.appendChild(item);
    });
}

function loadMockCommunity() {
    const container = document.getElementById('community-container');
    if (!container) return;

    if (currentPosts.length === 0) {
        currentPosts = [
            { id: 1, title: '게시글을 불러오는 중...', author: '시스템', content: '잠시만 기다려주세요.' }
        ];
    }
    renderPosts();
}

function renderPosts() {
    const container = document.getElementById('community-container');
    if (!container) return;

    container.innerHTML = '';

    if (currentPosts.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>게시글이 없습니다. 첫 글을 남겨보세요!</p></div>';
        return;
    }

    currentPosts.forEach(post => {
        const item = document.createElement('div');
        item.className = 'community-item';
        item.innerHTML = `
            <h4>${post.title}</h4>
            <div class="meta">
                <span>${ICONS.user} ${post.author}</span> &bull; <span>${post.date}</span>
            </div>
            <p style="margin-top: 10px; color: var(--text-light); font-size: 0.95rem;">
                ${post.content}
            </p>
        `;
        container.appendChild(item);
    });
}

async function addPost(title, content, author) {
    // 1. Optimistic UI (가짜 데이터 즉시 추가)
    const tempPost = {
        id: "temp-" + Date.now(),
        title: title,
        content: content,
        author: author,
        date: new Date().toISOString().split('T')[0]
    };

    currentPosts.unshift(tempPost);
    renderPosts();

    // 2. 서버 전송 (백그라운드)
    try {
        await fetch(CONFIG.API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({
                Title: title,
                Content: content,
                Author: author
            })
        });

        // 3. 진짜 데이터로 업데이트 (딜레이 후 새로고침)
        await new Promise(r => setTimeout(r, 1500));
        // await loadContent(); // 깜빡임 방지용으로 자동 로딩은 일단 끔. (사용자는 이미 가짜를 보고 있으니까!)
    } catch (e) {
        console.error(e);
    }
}

function openWriteModal() {
    if (modal) modal.classList.add('show');
}

function showToast(message) {
    const toastMsg = document.getElementById('toast-message');
    if (toastMsg) toastMsg.textContent = message;

    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
