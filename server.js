const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const uploadDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

let videos = [
    {
        id: "1",
        title: "Тестовое видео (Big Buck Bunny)",
        description: "Демонстрационный ролик",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    }
];

const htmlContent = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pure Tube</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #0f0f0f;
            color: #fff;
            margin: 0;
            padding: 20px;
        }
        header {
            max-width: 1200px;
            margin: 0 auto 20px auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 15px;
        }
        h1 { margin: 0; font-size: 24px; color: #ff0033; }
        input[type="text"] {
            width: 100%;
            max-width: 400px;
            padding: 10px 16px;
            border-radius: 20px;
            border: 1px solid #333;
            background: #222;
            color: #fff;
            font-size: 15px;
            outline: none;
        }
        .upload-section {
            max-width: 1200px;
            margin: 0 auto 30px auto;
            background: #1f1f1f;
            padding: 15px 20px;
            border-radius: 12px;
            border: 1px solid #282828;
        }
        .upload-form {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            align-items: center;
        }
        .file-label, .btn {
            background: #ff0033;
            color: #fff;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            border: none;
            font-size: 14px;
        }
        .file-label { background: #333; }
        .file-label:hover { background: #444; }
        .btn:hover { background: #cc0029; }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 20px;
        }
        .card {
            background: #1f1f1f;
            border-radius: 12px;
            overflow: hidden;
            cursor: pointer;
            transition: transform 0.2s;
            border: 1px solid #282828;
        }
        .card:hover { transform: scale(1.02); }
        .card video {
            width: 100%;
            height: 160px;
            object-fit: cover;
            background: #000;
        }
        .card-content { padding: 15px; }
        .card-title { font-size: 16px; font-weight: bold; margin-bottom: 6px; }
        .card-desc { font-size: 13px; color: #aaa; }

        #player-container {
            display: none;
            max-width: 900px;
            margin: 0 auto 30px auto;
            background: #1f1f1f;
            padding: 20px;
            border-radius: 12px;
            border: 1px solid #282828;
        }
        #player-container video {
            width: 100%;
            max-height: 500px;
            border-radius: 8px;
            background: #000;
        }
    </style>
</head>
<body>

    <header id="main-header">
        <h1>▶ Pure Tube</h1>
        <input type="text" id="search" placeholder="Поиск видео..." oninput="filterVideos()">
    </header>

    <div class="upload-section" id="upload-box">
        <form class="upload-form" id="uploadForm" onsubmit="uploadVideo(event)">
            <label class="file-label" for="video-file">📁 Выбрать файл</label>
            <input type="file" id="video-file" accept="video/*" style="display:none;" required onchange="updateFileName()">
            <span id="file-name" style="color: #aaa; font-size: 13px;">Файл не выбран</span>
            <input type="text" id="video-title" placeholder="Название видео" style="flex: 1; min-width: 150px;" required>
            <button type="submit" class="btn">Загрузить</button>
        </form>
    </div>

    <div id="player-container">
        <button class="btn" onclick="closePlayer()" style="margin-bottom: 15px;">← Назад</button>
        <video id="main-video" controls></video>
        <h2 id="video-title-display" style="margin: 15px 0 5px 0;"></h2>
    </div>

    <div class="container" id="video-grid"></div>

    <script>
        let allVideos = [];

        async function fetchVideos() {
            const res = await fetch('/api/videos');
            allVideos = await res.json();
            displayVideos(allVideos);
        }

        function displayVideos(videos) {
            const grid = document.getElementById('video-grid');
            grid.innerHTML = '';
            if (videos.length === 0) {
                grid.innerHTML = '<p style="color: #777;">Ничего не найдено</p>';
                return;
            }
            videos.forEach(v => {
                const card = document.createElement('div');
                card.className = 'card';
                card.onclick = () => openPlayer(v);
                card.innerHTML = \`
                    <video src="\${v.url}#t=0.5" preload="metadata" muted></video>
                    <div class="card-content">
                        <div class="card-title">\${v.title}</div>
                        <div class="card-desc">\${v.description}</div>
                    </div>
                \`;
                grid.appendChild(card);
            });
        }

        function filterVideos() {
            const q = document.getElementById('search').value.toLowerCase();
            const filtered = allVideos.filter(v => v.title.toLowerCase().includes(q));
            displayVideos(filtered);
        }

        async function uploadVideo(e) {
            e.preventDefault();
            const fileInput = document.getElementById('video-file');
            const titleInput = document.getElementById('video-title');

            const formData = new FormData();
            formData.append('video', fileInput.files[0]);
            formData.append('title', titleInput.value);

            const res = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                alert('Видео успешно загружено!');
                fileInput.value = '';
                titleInput.value = '';
                document.getElementById('file-name').innerText = 'Файл не выбран';
                fetchVideos();
            } else {
                alert('Ошибка при загрузке');
            }
        }

        function openPlayer(v) {
            document.getElementById('video-grid').style.display = 'none';
            document.getElementById('upload-box').style.display = 'none';
            document.getElementById('main-header').style.display = 'none';
            
            const p = document.getElementById('player-container');
            p.style.display = 'block';
            
            const vid = document.getElementById('main-video');
            vid.src = v.url;
            vid.play();
            
            document.getElementById('video-title-display').innerText = v.title;
        }

        function closePlayer() {
            const vid = document.getElementById('main-video');
            vid.pause();
            vid.src = '';
            
            document.getElementById('player-container').style.display = 'none';
            document.getElementById('video-grid').style.display = 'grid';
            document.getElementById('upload-box').style.display = 'block';
            document.getElementById('main-header').style.display = 'flex';
        }

        function updateFileName() {
            const file = document.getElementById('video-file').files[0];
            if (file) document.getElementById('file-name').innerText = file.name;
        }

        fetchVideos();
    </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'GET' && parsedUrl.pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlContent);
    } else if (req.method === 'GET' && parsedUrl.pathname === '/api/videos') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(videos));
    } else if (req.method === 'GET' && parsedUrl.pathname.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, parsedUrl.pathname);
        if (fs.existsSync(filePath)) {
            const stat = fs.statSync(filePath);
            res.writeHead(200, {
                'Content-Type': 'video/mp4',
                'Content-Length': stat.size
            });
            fs.createReadStream(filePath).pipe(res);
        } else {
            res.writeHead(404);
            res.end('File not found');
        }
    } else if (req.method === 'POST' && parsedUrl.pathname === '/upload') {
        let body = [];
        req.on('data', chunk => body.push(chunk));
        req.on('end', () => {
            const buffer = Buffer.concat(body);
            const contentType = req.headers['content-type'] || '';

            if (!contentType.includes('multipart/form-data')) {
                res.writeHead(400);
                return res.end('Bad Request');
            }

            const boundary = contentType.split('boundary=')[1];
            const parts = splitBuffer(buffer, '--' + boundary);

            let filename = '';
            let fileData = null;
            let title = 'Без названия';

            for (let part of parts) {
                if (part.length === 0) continue;
                const headerEndIndex = part.indexOf('\r\n\r\n');
                if (headerEndIndex === -1) continue;

                const headers = part.slice(0, headerEndIndex).toString();
                const content = part.slice(headerEndIndex + 4, part.length - 2);

                if (headers.includes('name="title"')) {
                    title = content.toString();
                } else if (headers.includes('name="video"')) {
                    const match = headers.match(/filename="(.+?)"/);
                    if (match) {
                        filename = Date.now() + '-' + match[1];
                    }
                    fileData = content;
                }
            }

            if (fileData && filename) {
                const targetPath = path.join(uploadDir, filename);
                fs.writeFileSync(targetPath, fileData);

                videos.unshift({
                    id: Date.now().toString(),
                    title: title || 'Видео',
                    description: 'Загружено на сервер',
                    url: `/uploads/${filename}`
                });

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } else {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'No file uploaded' }));
            }
        });
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

function splitBuffer(buffer, separator) {
    const parts = [];
    const sepBuf = Buffer.from(separator);
    let start = 0;
    let index;
    while ((index = buffer.indexOf(sepBuf, start)) !== -1) {
        if (index > start) {
            parts.push(buffer.slice(start, index));
        }
        start = index + sepBuf.length;
    }
    if (start < buffer.length) {
        parts.push(buffer.slice(start));
    }
    return parts;
}

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
