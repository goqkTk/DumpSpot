const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

// 보안 헤더 설정
app.use((req, res, next) => {
  // XSS 방지
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // 클릭재킹 방지
  res.setHeader('X-Frame-Options', 'DENY');
  // MIME 타입 스니핑 방지
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // HTTPS 강제 (프로덕션에서)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// 미들웨어 설정
app.use(express.json({ limit: '10mb' })); // JSON 크기 제한
app.use(express.static('public'));
// 업로드된 파일 접근 제한
app.use('/uploads', (req, res, next) => {
  const filename = req.path;
  
  // 허용된 이미지 확장자만 접근 가능
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
  const ext = path.extname(filename).toLowerCase();
  
  if (!allowedExtensions.includes(ext)) {
    return res.status(403).json({ error: '접근이 거부된 파일 형식입니다.' });
  }
  
  // 경로 조작 방지
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(403).json({ error: '잘못된 파일 경로입니다.' });
  }
  
  next();
}, express.static('uploads'));

// 세션 설정
app.use(session({
  secret: 'superduperholymolylegendpublickey',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // HTTPS 사용 시 true로 변경
}));

// SQLite 데이터베이스 설정
const db = new sqlite3.Database('database.sqlite');

// 데이터베이스 초기화
db.serialize(() => {
  // 건물 테이블
  db.run(`CREATE TABLE IF NOT EXISTS buildings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    floors INTEGER NOT NULL
  )`);

  // 평면도 이미지 테이블
  db.run(`CREATE TABLE IF NOT EXISTS floor_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    building_id INTEGER,
    floor_number INTEGER,
    image_path TEXT,
    FOREIGN KEY (building_id) REFERENCES buildings (id)
  )`);

  // 쓰레기통 테이블
  db.run(`CREATE TABLE IF NOT EXISTS trash_bins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    building_id INTEGER,
    floor_number INTEGER,
    x_position REAL NOT NULL,
    y_position REAL NOT NULL,
    image_path TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (building_id) REFERENCES buildings (id)
  )`);

  // 사용자 테이블
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )`);

// 초기 데이터 삽입
  db.run(`INSERT OR IGNORE INTO buildings (id, name, floors) VALUES 
      (1, '정보관', 4),
      (2, '본관', 6),
      (3, '신관', 5),
      (4, '체육관', 3)`);
    
  db.run(`INSERT OR IGNORE INTO users (id, username, password) VALUES 
      (1, 'guest', '$2b$10$6g1UHM2XAnV8xgm6KzlSqexSet0rz.r4G4eOZgZHPVR.Yx6EucF4K'),
      (2, 'test', '$2b$10$UKZ3emYdJJa/Co.XFojWDOJMwxn7275oqPWaShD3ht8LZ.lLY4cmO'),
      (3, 'adnim', '$2b$10$AUiSDPhNHCLVN40kf8iWneB.aXjRtNKdQz1GKaoe.cPTd.5fyojYC'),
      (4, 'apple', '$2b$10$7KIh2ioJ8aDUmhKm.e.3RubQa0bo664r5zcPNRkaHwPtQf6YMxpOi'),
      (5, 'admin', '$2b$10$/PJoH28UthMDJQNOnAMf6eSvOFjpZ8aax2OA2YQnv87YyciK/iyaO')`);
});

// 파일 업로드 보안 설정
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 파일명 보안 강화: 타임스탬프와 랜덤 문자열 사용
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const ext = path.extname(file.originalname).toLowerCase();
    
    // 허용된 확장자만 사용
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
    if (!allowedExtensions.includes(ext)) {
      return cb(new Error('허용되지 않는 파일 형식입니다.'));
    }
    
    cb(null, `upload_${timestamp}_${randomString}${ext}`);
  }
});

// 파일 업로드 필터 강화
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB 제한
    files: 1 // 한 번에 하나의 파일만
  },
  fileFilter: function (req, file, cb) {
    // 파일 확장자 검사
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (!allowedExtensions.includes(ext)) {
      return cb(new Error('허용되지 않는 파일 확장자입니다.'));
    }
    
    // MIME 타입 검사
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('허용되지 않는 파일 타입입니다.'));
    }
    
    // 파일명 검사 (특수문자, 경로 조작 방지)
    const filename = file.originalname;
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return cb(new Error('잘못된 파일명입니다.'));
    }
    
    cb(null, true);
  }
});

// 라우트
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// 건물 목록 API
app.get('/api/buildings', (req, res) => {
  db.all('SELECT * FROM buildings ORDER BY id', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// 평면도 이미지 경로 가져오기
app.get('/api/floor-plan/:buildingId/:floorNumber', (req, res) => {
  const { buildingId, floorNumber } = req.params;
  
  // 전체 캠퍼스인 경우 (buildingId가 0)
  if (buildingId === '0') {
    db.get(
      'SELECT image_path FROM floor_plans WHERE building_id = 0 AND floor_number = 0',
      (err, row) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ imagePath: row ? row.image_path : null });
      }
    );
  } else {
    db.get(
      'SELECT image_path FROM floor_plans WHERE building_id = ? AND floor_number = ?',
      [buildingId, floorNumber],
      (err, row) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ imagePath: row ? row.image_path : null });
      }
    );
  }
});

// 회원가입 API
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ success: false, error: '아이디와 비밀번호를 입력해주세요.' });
  }
  
  if (username.length < 3) {
    return res.status(400).json({ success: false, error: '아이디는 3자 이상이어야 합니다.' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ success: false, error: '비밀번호는 6자 이상이어야 합니다.' });
  }
  
  try {
    // bcrypt로 비밀번호 해싱 (salt rounds: 10)
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            res.status(400).json({ success: false, error: '이미 존재하는 아이디입니다.' });
          } else {
            res.status(500).json({ success: false, error: err.message });
          }
          return;
        }
        res.json({ success: true, message: '회원가입이 완료되었습니다.' });
      }
    );
  } catch (error) {
    res.status(500).json({ success: false, error: '비밀번호 해싱 중 오류가 발생했습니다.' });
  }
});

// 로그인 API
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ success: false, error: '아이디와 비밀번호를 입력해주세요.' });
  }
  
  db.get(
    'SELECT * FROM users WHERE username = ?',
    [username],
    async (err, user) => {
      if (err) {
        res.status(500).json({ success: false, error: err.message });
        return;
      }
      
      if (!user) {
        res.status(401).json({ success: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
        return;
      }
      
      try {
        // bcrypt로 비밀번호 검증
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
          res.status(401).json({ success: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
          return;
        }
        
        // 세션에 사용자 정보 저장
        req.session = req.session || {};
        req.session.userId = user.id;
        req.session.username = user.username;
        
        res.json({ 
          success: true, 
          message: '로그인 성공',
          user: {
            id: user.id,
            username: user.username
          }
        });
      } catch (error) {
        res.status(500).json({ success: false, error: '비밀번호 검증 중 오류가 발생했습니다.' });
      }
    }
  );
});

// 로그아웃 API
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ success: false, error: '로그아웃 중 오류가 발생했습니다.' });
      return;
    }
    res.json({ success: true, message: '로그아웃되었습니다.' });
  });
});

// 세션 확인 API
app.get('/api/session', (req, res) => {
  if (req.session && req.session.userId) {
    res.json({ 
      success: true, 
      user: {
        id: req.session.userId,
        username: req.session.username
      }
    });
  } else {
    res.json({ success: false });
  }
});

// 관리자 권한 확인 API
app.get('/api/check-admin', (req, res) => {
  if (req.session && req.session.userId && req.session.username === 'admin') {
    res.json({ success: true, isAdmin: true });
  } else {
    res.json({ success: true, isAdmin: false });
  }
});

// 평면도 이미지 업로드
app.post('/api/upload-floor-plan', (req, res) => {
  upload.single('image')(req, res, function(err) {
    if (err) {
      // 파일 업로드 에러 처리
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: '파일 크기는 5MB 이하여야 합니다.' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ error: '한 번에 하나의 파일만 업로드 가능합니다.' });
        }
      }
      return res.status(400).json({ error: err.message || '파일 업로드 중 오류가 발생했습니다.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: '이미지 파일이 필요합니다.' });
    }

    const { buildingId, floorNumber } = req.body;
    const imagePath = req.file.filename;

    // 입력값 검증
    if (!buildingId && buildingId !== 0) {
      return res.status(400).json({ error: '건물 ID가 필요합니다.' });
    }

    // 전체 캠퍼스인 경우 building_id를 0으로 설정
    const actualBuildingId = buildingId === '0' ? 0 : buildingId;
    const actualFloorNumber = buildingId === '0' ? 0 : floorNumber;

    db.run(
      'INSERT OR REPLACE INTO floor_plans (building_id, floor_number, image_path) VALUES (?, ?, ?)',
      [actualBuildingId, actualFloorNumber, imagePath],
      function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ 
          success: true, 
          message: '평면도가 성공적으로 업로드되었습니다.',
          imagePath: imagePath
        });
      }
    );
  });
});

// 쓰레기통 목록 조회
app.get('/api/trash-bins/:buildingId/:floorNumber', (req, res) => {
  const { buildingId, floorNumber } = req.params;
  
  db.all(
    'SELECT * FROM trash_bins WHERE building_id = ? AND floor_number = ? ORDER BY created_at DESC',
    [buildingId, floorNumber],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

// 쓰레기통 추가
app.post('/api/trash-bins', (req, res) => {
  upload.single('image')(req, res, function(err) {
    if (err) {
      // 파일 업로드 에러 처리
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: '파일 크기는 5MB 이하여야 합니다.' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ error: '한 번에 하나의 파일만 업로드 가능합니다.' });
        }
      }
      return res.status(400).json({ error: err.message || '파일 업로드 중 오류가 발생했습니다.' });
    }

    const { buildingId, floorNumber, xPosition, yPosition, description } = req.body;
    const imagePath = req.file ? req.file.filename : null;

    // 입력값 검증
    if (!buildingId && buildingId !== 0) {
      return res.status(400).json({ error: '건물 ID가 필요합니다.' });
    }
    if (!floorNumber && floorNumber !== 0) {
      return res.status(400).json({ error: '층 번호가 필요합니다.' });
    }
    if (!xPosition || !yPosition) {
      return res.status(400).json({ error: '위치 정보가 필요합니다.' });
    }

    // 위치값 범위 검증 (0-100%)
    const x = parseFloat(xPosition);
    const y = parseFloat(yPosition);
    if (isNaN(x) || isNaN(y) || x < 0 || x > 100 || y < 0 || y > 100) {
      return res.status(400).json({ error: '잘못된 위치 정보입니다.' });
    }

    // 설명 길이 제한
    if (description && description.length > 500) {
      return res.status(400).json({ error: '설명은 500자 이하여야 합니다.' });
    }

    db.run(
      'INSERT INTO trash_bins (building_id, floor_number, x_position, y_position, image_path, description) VALUES (?, ?, ?, ?, ?, ?)',
      [buildingId, floorNumber, x, y, imagePath, description],
      function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ 
          success: true, 
          message: '쓰레기통이 성공적으로 추가되었습니다.',
          id: this.lastID
        });
      }
    );
  });
});

// 쓰레기통 삭제
app.delete('/api/trash-bins/:id', (req, res) => {
  const { id } = req.params;
  
  db.run(
    'DELETE FROM trash_bins WHERE id = ?',
    [id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ 
        success: true, 
        message: '쓰레기통이 성공적으로 삭제되었습니다.'
      });
    }
  );
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
}); 