const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'videos.json');

// Создаем файл базы данных для видео, если его нет
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([
    {
      id: "1",
      title: "Тестовое видео (Big Buck Bunny)",
      description: "Пример работы плеера",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    }
  ], null, 2));
}

function readVideos() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function saveVideos(videos) {
  fs.writeFileSync(DB_FILE, JSON.stringify(videos, null, 2));
}

const server = http.createServer((req, res) => {
  // API: Получить список видео
  if (req.method === 'GET' && req.url === '/api/videos') {
    const videos = readVideos();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(videos));
    return;
  }

  // API: Добавить новое видео
  if (req.method === 'POST' && req.url === '/api/add') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { title, description, url } = JSON.parse(body || '{}');
        if (title && url) {
          const videos = readVideos();
          videos.unshift({
            id: Date.now().toString(),
            title,
            description: description || '',
            url
          });
          saveVideos(videos);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Bad JSON' }));
      }
    });
    return;
  }

  // Главная страница со встроенным HTML/CSS/JS
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pure Node Tube</title>
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
        .form-section {
            max-width: 1200px;
            margin: 0 auto 30px auto;
            background: #1f1f1f;
            padding: 15px 20px;
            border-radius: 12px;
            border: 1px solid #282828;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        .form-section input { flex: 1; min-width: 200px; margin-top: 0; }
        .btn {
            background: #ff0033;
            color: #fff;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            border: none;
        }
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

    <div class="form-section" id="form-box">
        <input type="text" id="video-title" placeholder="Название видео...">
        <input type="text" id="video-url" placeholder="Прямая ссылка на видео (.mp4)...">
        <button class="btn" onclick="addVideo()">Добавить</button>
    </div>

    <div id="player-container">
        <button class="btn" onclick="closePlayer()" style="margin-bottom: 15px;">← Назад</button>
        <video id="main-video" controls></video>
        <h2 id="player-title" style="margin: 15px 0 5px 0;"></h2>
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

        async function addVideo() {
            const title = document.getElementById('video-title').value.trim();
            const url = document.getElementById('video-url').value.trim();
            if (!title || !url) {
                alert('Заполните название и ссылку!');
                return;
            }

            await fetch('/api/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, url })
            });

            document.getElementById('video-title').value = '';
            document.getElementById('video-url').value = '';
            fetchVideos();
        }

        function openPlayer(v) {
            document.getElementById('video-grid').style.display = 'none';
            document.getElementById('form-box').style.display = 'none';
            document.getElementById('main-header').style.display = 'none';
            
            const p = document.getElementById('player-container');
            p.style.display = 'block';
            
            const vid = document.getElementById('main-video');
            vid.src = v.url;
            vid.play();
            
            document.getElementById('player-title').innerText = v.title;
        }

        function closePlayer() {
            const vid = document.getElementById('main-video');
            vid.pause();
            vid.src = '';
            
            document.getElementById('player-container').style.display = 'none';
            document.getElementById('video-grid').style.display = 'grid';
            document.getElementById('form-box').style.display = 'flex';
            document.getElementById('main-header').style.display = 'flex';
        }

        fetchVideos();
    </script>
</body>
</html>`);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
