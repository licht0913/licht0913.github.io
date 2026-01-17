// Notion Configuration
// 주의: GitHub Pages와 같은 정적 호스팅에서는 API Key를 직접 노출하면 보안 위험이 있습니다.
// 실제 서비스 시에는 백엔드 프록시 서버를 구축하거나, Netlify Functions 등을 사용하는 것을 권장합니다.
// 테스트 목적으로만 아래 값을 채워주세요.

const NOTION_CONFIG = {
    API_KEY: 'secret_YOUR_NOTION_API_KEY_HERE',
    DATABASE_ID_GALLERY: 'YOUR_GALLERY_DATABASE_ID',
    DATABASE_ID_COMMUNITY: 'YOUR_COMMUNITY_DATABASE_ID'
};

// 데모 모드 (Notion 키가 없을 때 로컬 데이터 사용)
const DEMO_MODE = true;
