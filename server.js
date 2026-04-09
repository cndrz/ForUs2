const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static(UPLOADS_DIR));

// Configure Multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Helper to read DB
const readDB = () => {
    if (!fs.existsSync(DB_FILE)) {
        return { startDate: "2025-04-07", albums: [], notes: [] };
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
};

// Helper to write DB
const writeDB = (data) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

// API Endpoints
app.get('/api/data', (req, res) => {
    res.json(readDB());
});

app.post('/api/save', (req, res) => {
    const newData = req.body;
    writeDB(newData);
    res.json({ success: true, data: newData });
});

app.post('/api/upload', upload.single('photo'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
