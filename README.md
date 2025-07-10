# 학교 쓰레기통 지도 (DumpSpot)

학교 건물별 층별 평면도를 표시하는 웹 애플리케이션입니다.

## 기능

- **건물 선택**: 정보관, 본관, 신관, 체육관 중 선택
- **층별 평면도**: 선택한 건물의 층별 평면도 표시
- **관리자 기능**: 평면도 이미지 업로드 및 관리
- **반응형 디자인**: 모바일과 데스크톱에서 모두 사용 가능

## 기술 스택

- **Backend**: Node.js, Express.js
- **Database**: SQLite
- **Frontend**: HTML, CSS, JavaScript
- **File Upload**: Multer

## 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 서버 실행

```bash
# 개발 모드 (자동 재시작)
npm run dev

# 프로덕션 모드
npm start
```

### 3. 접속

- 메인 페이지: http://localhost:3000
- 관리자 페이지: http://localhost:3000/admin

## 사용법

### 일반 사용자

1. 메인 페이지에서 왼쪽 사이드바의 건물 버튼 클릭
2. 해당 건물의 층 버튼이 나타나면 원하는 층 선택
3. 선택한 층의 평면도가 메인 화면에 표시됨

### 관리자

1. 관리자 페이지 접속
2. 건물과 층 선택
3. 평면도 이미지 파일 선택 (JPG, PNG, GIF 지원)
4. 업로드 버튼 클릭
5. 업로드된 평면도는 오른쪽 목록에서 확인 가능

## 프로젝트 구조

```
DumpSpot/
├── server.js              # Express 서버
├── database.sqlite        # SQLite 데이터베이스
├── package.json           # 프로젝트 설정
├── public/                # 정적 파일
│   ├── index.html         # 메인 페이지
│   ├── admin.html         # 관리자 페이지
│   ├── styles.css         # 공통 스타일
│   ├── admin.css          # 관리자 페이지 스타일
│   ├── script.js          # 메인 페이지 JavaScript
│   └── admin.js           # 관리자 페이지 JavaScript
├── uploads/               # 업로드된 이미지 저장소
└── README.md              # 프로젝트 설명서
```

## 데이터베이스 스키마

### buildings 테이블
- `id`: 건물 ID (Primary Key)
- `name`: 건물명
- `floors`: 총 층수

### floor_plans 테이블
- `id`: 평면도 ID (Primary Key)
- `building_id`: 건물 ID (Foreign Key)
- `floor_number`: 층 번호
- `image_path`: 이미지 파일 경로

## API 엔드포인트

- `GET /api/buildings` - 건물 목록 조회
- `GET /api/floor-plan/:buildingId/:floorNumber` - 평면도 이미지 경로 조회
- `POST /api/upload-floor-plan` - 평면도 이미지 업로드

## 주의사항

- 이미지 파일 크기는 5MB 이하여야 합니다
- 지원하는 이미지 형식: JPG, PNG, GIF
- 업로드된 이미지는 `uploads/` 폴더에 저장됩니다

## 라이선스

MIT License 