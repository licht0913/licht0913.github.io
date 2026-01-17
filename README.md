# Class Homepage (licht0913.github.io)

이 프로젝트는 중학교 학급 홈페이지를 위한 정적 웹사이트 템플릿입니다. GitHub Pages에 호스팅하기 적합하도록 설계되었습니다.

## 특징
- **Glassmorphism 디자인**: 최신 트렌드의 깔끔하고 예쁜 디자인
- **반응형 웹**: 모바일과 PC 모두 지원
- **SPA (Single Page Application)**: 페이지 새로고침 없이 부드러운 화면 전환
- **기능**: 홈, 갤러리, 커뮤니티, 가입하기

## 설치 및 배포 방법

1. 이 폴더의 모든 파일을 GitHub 저장소(`licht0913.github.io`)에 업로드합니다.
2. GitHub Settings -> Pages에서 배포 소스를 `main` 브랜치로 설정합니다.
3. 잠시 후 `https://licht0913.github.io`에서 사이트를 확인할 수 있습니다.

## Notion 연동 주의사항

현재는 **데모 모드(`DEMO_MODE = true`)**로 설정되어 있어, 실제 Notion 데이터가 아닌 가짜 데이터가 표시됩니다.

실제로 Notion을 데이터베이스로 사용하려면 두 가지 방법이 있습니다:

1. **(권장) 백엔드 서버 구축**: Notion API 키를 숨기기 위해 중계 서버를 만듭니다.
2. **(간편) Notion to Website 서비스 사용**: 우피(Oopy)나 포션(Potion) 같은 서비스를 사용합니다.
3. **(고급) Serverless Function**: Netlify Functions나 Vercel 등을 사용하여 API를 호출합니다.

`config.js` 파일에서 설정을 변경할 수 있지만, GitHub Pages에 API Key를 직접 올리면 해킹 위험이 있으니 주의하세요!
