const pages = document.querySelectorAll('.page'), navLinks = document.querySelectorAll('.nav-links li'), mobileMenuBtn = document.querySelector('.mobile-menu-btn'), navLinksContainer = document.querySelector('.nav-links'), modal = document.getElementById('write-modal'), toast = document.getElementById('toast'), ICONS = { user: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' }; let currentPosts = []; document.addEventListener('DOMContentLoaded', () => { initNavigation(); loadContent() }); function initNavigation() { navLinks.forEach(e => { e.addEventListener('click', () => { let t = e.getAttribute('data-target'); navigateTo(t), window.innerWidth <= 768 && navLinksContainer.classList.remove('active') }) }), mobileMenuBtn.addEventListener('click', () => { navLinksContainer.classList.toggle('active') }), document.querySelector('.close-modal').addEventListener('click', () => { modal.classList.remove('show') }), window.addEventListener('click', e => { e.target === modal && modal.classList.remove('show') }), document.getElementById('signup-form').addEventListener('submit', e => { e.preventDefault(), showToast('가입 신청 완료!'), e.target.reset() }), document.getElementById('write-form').addEventListener('submit', async e => { e.preventDefault(); let t = e.target.querySelector('input').value, n = e.target.querySelector('textarea').value; await addPost(t, n), modal.classList.remove('show'), showToast('게시글 등록 중...'), e.target.reset() }) } function navigateTo(e) { navLinks.forEach(t => { t.getAttribute('data-target') === e ? t.classList.add('active') : t.classList.remove('active') }), pages.forEach(t => { t.id === e ? t.classList.add('active') : t.classList.remove('active') }), window.scrollTo(0, 0) }
// 헬퍼: 안전하게 값 꺼내기 (핵심 수정!)
function getProp(item, keys) {
    for (let key of keys) {
        if (item[key]) {
            // 제목/글쓴이(Text) 경우
            if (item[key].title && item[key].title[0]) return item[key].title[0].plain_text;
            if (item[key].rich_text && item[key].rich_text[0]) return item[key].rich_text[0].plain_text;
            // 날짜(Date) 경우
            if (item[key].date) return item[key].date.start;
        }
    }
    return ""; // 없으면 빈 문자열
}

async function loadContent() {
    console.log("Fetching form GAS..."); if (CONFIG.API_URL.includes("ENTER_YOUR")) { loadMockGallery(), loadMockCommunity(); return } try {
        const e = await fetch(CONFIG.API_URL); const t = await e.json(); if (t.error) throw new Error(t.error);
        // 데이터 매핑 로직 강화 (한글/영어 대소문자 모두 체크)
        currentPosts = t.map(e => ({
            id: e.id,
            title: getProp(e.properties || e, ["Title", "title", "제목"]) || "제목 없음",
            content: getProp(e.properties || e, ["Content", "content", "내용"]) || "",
            author: getProp(e.properties || e, ["Author", "author", "글쓴이", "작성자"]) || "익명",
            date: getProp(e.properties || e, ["Date", "date", "날짜"]) || new Date().toISOString().split('T')[0]
        }));
        renderPosts()
    } catch (e) { console.error(e), loadMockCommunity() } loadMockGallery()
} function loadMockGallery() { let e = document.getElementById('gallery-container'); e.innerHTML = '';[{ url: 'https://picsum.photos/300/300?random=1', title: '체육대회' }, { url: 'https://picsum.photos/300/300?random=2', title: '현장학습' }, { url: 'https://picsum.photos/300/300?random=3', title: '급식실' }, { url: 'https://picsum.photos/300/300?random=4', title: '쉬는 시간' }, { url: 'https://picsum.photos/300/300?random=5', title: '과학실' }, { url: 'https://picsum.photos/300/300?random=6', title: '방과후' }].forEach(t => { let n = document.createElement('div'); n.className = 'gallery-item', n.innerHTML = `<img src="${t.url}" alt="${t.title}" loading="lazy"><div class="gallery-overlay"><h4>${t.title}</h4></div>`, e.appendChild(n) }) } function loadMockCommunity() { let e = document.getElementById('community-container'); 0 === currentPosts.length && (currentPosts = [{ id: 1, title: '로딩중...', author: '시스템', content: '데이터를 불러오고 있습니다.' }]), renderPosts() } function renderPosts() { let e = document.getElementById('community-container'); if (e.innerHTML = '', 0 === currentPosts.length) { e.innerHTML = '<div class="empty-state"><p>게시글이 없습니다.</p></div>'; return } currentPosts.forEach(t => { let n = document.createElement('div'); n.className = 'community-item', n.innerHTML = `<h4>${t.title}</h4><div class="meta"><span>${ICONS.user} ${t.author}</span> &bull; <span>${t.date}</span></div><p style="margin-top: 10px; color: var(--text-light); font-size: 0.95rem;">${t.content}</p>`, e.appendChild(n) }) } async function addPost(e, t) { if (CONFIG.API_URL.includes("ENTER_YOUR")) { alert("API 설정 필요"); return } try { await fetch(CONFIG.API_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ Title: e, Content: t, Author: "익명" }) }); await new Promise(r => setTimeout(r, 1000)); await loadContent() } catch (e) { console.error(e) } } function openWriteModal() { modal.classList.add('show') } function showToast(e) { let t = document.getElementById('toast-message'); t.textContent = e, toast.classList.add('show'), setTimeout(() => { toast.classList.remove('show') }, 3e3) }
