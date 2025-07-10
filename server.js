const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

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

  // 초기 데이터 삽입
  db.run(`INSERT OR IGNORE INTO buildings (id, name, floors) VALUES 
    (1, '정보관', 4),
    (2, '본관', 6),
    (3, '신관', 5),
    (4, '체육관', 3)`);
});

// 이미지 업로드 설정
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const buildingId = req.body.buildingId;
    const floorNumber = req.body.floorNumber;
    const ext = path.extname(file.originalname);
    cb(null, `building_${buildingId}_floor_${floorNumber}${ext}`);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다!'));
    }
  }
});

// 라우트
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
});

// 평면도 이미지 업로드
app.post('/api/upload-floor-plan', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '이미지 파일이 필요합니다.' });
  }

  const { buildingId, floorNumber } = req.body;
  const imagePath = req.file.filename;

  db.run(
    'INSERT OR REPLACE INTO floor_plans (building_id, floor_number, image_path) VALUES (?, ?, ?)',
    [buildingId, floorNumber, imagePath],
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

// 서버 시작
app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
}); 