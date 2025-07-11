const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const uploadDir = path.join(__dirname, "uploads");
const dataFile = path.join(__dirname, "data.json");

// Ensure directories and files exist
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, JSON.stringify({ 
    videos: [], 
    images: [], 
    pastes: [],
    settings: { darkMode: true }
  }, null, 2));
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Separate upload configurations for different types
const videoUpload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /mp4|webm|mov/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb(new Error('Only video files are allowed!'));
  }
});

const imageUpload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb(new Error('Only image files are allowed!'));
  }
});

// Middleware
app.use(express.static("uploads"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Utility functions
function loadData() {
  try {
    return JSON.parse(fs.readFileSync(dataFile));
  } catch (err) {
    console.error('Error loading data:', err);
    return { videos: [], images: [], pastes: [], settings: { darkMode: true } };
  }
}

function saveData(data) {
  try {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving data:', err);
  }
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderPage(title, content, req, backLink = true) {
  const data = loadData();
  const darkMode = data.settings?.darkMode ?? true;
  
  return `
    <!DOCTYPE html>
    <html lang="en" data-theme="${darkMode ? 'dark' : 'light'}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} | Gallery</title>
      ${getStyles()}
      <script>
        function toggleTheme() {
          const html = document.documentElement;
          const isDark = html.getAttribute('data-theme') === 'dark';
          html.setAttribute('data-theme', isDark ? 'light' : 'dark');
          fetch('/settings/toggle-theme', { method: 'POST' });
        }
        
        function copyToClipboard(text) {
          navigator.clipboard.writeText(text).then(() => {
            alert('Copied to clipboard!');
          }).catch(err => {
            console.error('Failed to copy: ', err);
          });
        }
        
        function downloadPaste(content, filename) {
          const blob = new Blob([content], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename || 'paste.txt';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      </script>
    </head>
    <body>
      <header class="header-center">
        <div class="header-content">
          <h1><a href="/">Gallery</a></h1>
          <nav class="main-nav">
            <a href="/videos">Videos</a>
            <a href="/images">Images</a>
            <a href="/pastes">Pastes</a>
            <button onclick="toggleTheme()" class="theme-toggle">
              ${darkMode ? 'Light mode' : ' Dark mode'}
            </button>
          </nav>
        </div>
      </header>
      <main>
        ${content}
      </main>
      ${backLink ? '<footer class="footer-center"><a href="javascript:history.back()" class="button">Back</a></footer>' : ''}
    </body>
    </html>
  `;
}

function getStyles() {
  return `
  <style>
    :root {
      --primary: #2563eb;
      --primary-hover: #1d4ed8;
      --text: #1a1a1a;
      --text-secondary: #4a5568;
      --background: #ffffff;
      --card-bg: #f7fafc;
      --border: #e2e8f0;
      --error: #ef4444;
      --success: #10b981;
    }
    
    [data-theme="dark"] {
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --text: #f8fafc;
      --text-secondary: #94a3b8;
      --background: #0f172a;
      --card-bg: #1e293b;
      --border: #334155;
      --error: #ef4444;
      --success: #10b981;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }
    
    body {
      background-color: var(--background);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    
    .header-center {
      display: flex;
      justify-content: center;
      width: 100%;
      background-color: var(--card-bg);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .header-content {
      width: 100%;
      max-width: 1200px;
      padding: 1rem;
    }
    
    .footer-center {
      text-align: center;
      padding: 1rem;
    }
    
    header h1 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
      text-align: center;
    }
    
    header h1 a {
      color: var(--text);
      text-decoration: none;
    }
    
    .main-nav {
      display: flex;
      gap: 1rem;
      overflow-x: auto;
      padding-bottom: 0.5rem;
      justify-content: center;
      flex-wrap: wrap;
    }
    
    .main-nav a, .theme-toggle {
      color: var(--text-secondary);
      text-decoration: none;
      font-weight: 500;
      white-space: nowrap;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      font-family: inherit;
    }
    
    .main-nav a:hover, .theme-toggle:hover {
      color: var(--primary);
    }
    
    main {
      flex: 1;
      padding: 1rem;
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
    }
    
    .center-content {
      text-align: center;
    }
    
    a, button {
      color: var(--primary);
      text-decoration: none;
      background: none;
      border: none;
      cursor: pointer;
    }
    
    a:hover, button:hover {
      color: var(--primary-hover);
      text-decoration: underline;
    }
    
    .button {
      display: inline-block;
      background-color: var(--primary);
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      font-weight: 500;
      text-decoration: none;
      transition: background-color 0.2s;
    }
    
    .button:hover {
      background-color: var(--primary-hover);
      text-decoration: none;
    }
    
    .button-group {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin: 1rem 0;
    }
    
    .button-outline {
      background: none;
      border: 1px solid var(--primary);
      color: var(--primary);
    }
    
    .button-outline:hover {
      background: var(--primary);
      color: white;
    }
    
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1rem;
      margin: 1rem 0;
    }
    
    .card {
      background: var(--card-bg);
      border-radius: 0.5rem;
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
      border: 1px solid var(--border);
    }
    
    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .card img, .card video {
      width: 100%;
      height: auto;
      aspect-ratio: 16/9;
      object-fit: cover;
    }
    
    .card-content {
      padding: 1rem;
    }
    
    .card h3 {
      margin-bottom: 0.5rem;
      font-size: 1rem;
    }
    
    .card p {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }
    
    .card .timestamp {
      color: var(--text-secondary);
      font-size: 0.75rem;
      margin-top: 0.5rem;
    }
    
    .form-container {
      background: var(--card-bg);
      padding: 1.5rem;
      border-radius: 0.5rem;
      max-width: 600px;
      margin: 1rem auto;
      border: 1px solid var(--border);
    }
    
    .form-group {
      margin-bottom: 1rem;
    }
    
    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }
    
    input, textarea, select {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid var(--border);
      border-radius: 0.375rem;
      background-color: var(--card-bg);
      color: var(--text);
      font-family: inherit;
    }
    
    textarea {
      min-height: 150px;
      resize: vertical;
    }
    
    input[type="file"] {
      padding: 0;
      border: none;
      background: none;
    }
    
    .error {
      color: var(--error);
      margin: 1rem 0;
      padding: 1rem;
      background-color: rgba(239, 68, 68, 0.1);
      border-radius: 0.375rem;
      border: 1px solid var(--error);
    }
    
    .success {
      color: var(--success);
      margin: 1rem 0;
      padding: 1rem;
      background-color: rgba(16, 185, 129, 0.1);
      border-radius: 0.375rem;
      border: 1px solid var(--success);
    }
    
    .video-player {
      width: 100%;
      max-width: 800px;
      margin: 1rem auto;
      background: black;
      border-radius: 0.5rem;
      overflow: hidden;
    }
    
    .video-player video {
      width: 100%;
      display: block;
    }
    
    .comments {
      margin-top: 2rem;
      max-width: 800px;
    }
    
    .comment {
      background: var(--card-bg);
      padding: 1rem;
      border-radius: 0.5rem;
      margin-bottom: 1rem;
      border: 1px solid var(--border);
    }
    
    .comment-author {
      font-weight: 500;
      margin-bottom: 0.5rem;
    }
    
    .comment-date {
      color: var(--text-secondary);
      font-size: 0.8rem;
      margin-top: 0.5rem;
    }
    
    .paste-container {
      background: var(--card-bg);
      padding: 1rem;
      border-radius: 0.5rem;
      margin: 1rem 0;
      border: 1px solid var(--border);
    }
    
    pre {
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: 'Courier New', Courier, monospace;
      background: var(--background);
      padding: 1rem;
      border-radius: 0.5rem;
      overflow-x: auto;
      border: 1px solid var(--border);
    }
    
    .paste-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 1rem;
      flex-wrap: wrap;
    }
    
    @media (max-width: 640px) {
      .grid {
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      }
      
      .form-container {
        padding: 1rem;
      }
      
      .main-nav {
        justify-content: flex-start;
      }
    }
  </style>
  `;
}

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).send(renderPage('Error', `<p class="error">File upload error: ${err.message}</p><a href="/" class="button">Go Home</a>`, req));
  } else if (err) {
    return res.status(500).send(renderPage('Error', `<p class="error">Server error: ${err.message}</p><a href="/" class="button">Go Home</a>`, req));
  }
  next();
});

// Routes
app.get("/", (req, res) => {
  const data = loadData();
  const latestVideos = data.videos.slice(-3).reverse();
  const latestImages = data.images.slice(-6).reverse();
  const latestPastes = data.pastes.slice(-3).reverse();
  
  const content = `
    <section>
      <div class="center-content">
        <h2>Welcome to Gallery</h2>
        <p>Upload and share your videos, images, and code pastes.</p>
        
        <div class="button-group" style="justify-content: center;">
          <a href="/upload/video" class="button">Upload Video</a>
          <a href="/upload/image" class="button">Upload Image</a>
          <a href="/upload/paste" class="button">Upload Paste</a>
        </div>
      </div>
      
      <section>
        <h2 class="center-content">Recent Videos</h2>
        ${latestVideos.length > 0 ? `
          <div class="grid">
            ${latestVideos.map(video => `
              <div class="card" onclick="location.href='/video/${video.id}'">
                ${video.thumbnail ? `<img src="/${video.thumbnail}" alt="${video.title}" loading="lazy" />` : ''}
                <div class="card-content">
                  <h3>${video.title}</h3>
                  <p>${video.description.substring(0, 50)}${video.description.length > 50 ? '...' : ''}</p>
                  <p class="timestamp">${new Date(video.createdAt).toLocaleString()}</p>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="center-content" style="margin: 1rem 0;">
            <a href="/videos" class="button">View All Videos</a>
          </div>
        ` : '<p class="center-content">No videos uploaded yet.</p>'}
      </section>
      
      <section>
        <h2 class="center-content">Recent Images</h2>
        ${latestImages.length > 0 ? `
          <div class="grid">
            ${latestImages.map(image => `
              <div class="card" onclick="location.href='/image/${image.filename}'">
                <img src="/${image.filename}" alt="Uploaded image" loading="lazy" />
                <div class="card-content">
                  <p class="timestamp">${new Date(image.uploadedAt).toLocaleString()}</p>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="center-content" style="margin: 1rem 0;">
            <a href="/images" class="button">View All Images</a>
          </div>
        ` : '<p class="center-content">No images uploaded yet.</p>'}
      </section>
      
      <section>
        <h2 class="center-content">Recent Pastes</h2>
        ${latestPastes.length > 0 ? `
          <div class="grid">
            ${latestPastes.map(paste => `
              <div class="card" onclick="location.href='/paste/${paste.id}'">
                <div class="card-content">
                  <h3>${paste.title}</h3>
                  <p>${paste.code.substring(0, 50)}${paste.code.length > 50 ? '...' : ''}</p>
                  <p class="timestamp">${new Date(paste.createdAt).toLocaleString()}</p>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="center-content" style="margin: 1rem 0;">
            <a href="/pastes" class="button">View All Pastes</a>
          </div>
        ` : '<p class="center-content">No pastes uploaded yet.</p>'}
      </section>
    </section>
  `;
  
  res.send(renderPage('Home', content, req, false));
});

// Settings routes
app.post("/settings/toggle-theme", (req, res) => {
  const data = loadData();
  data.settings = data.settings || {};
  data.settings.darkMode = !data.settings.darkMode;
  saveData(data);
  res.sendStatus(200);
});

// Video routes
app.get("/videos", (req, res) => {
  const data = loadData();
  const videos = data.videos.reverse();
  
  const content = `
    <section>
      <h2 class="center-content">All Videos</h2>
      <div class="center-content" style="margin-bottom: 1rem;">
        <a href="/upload/video" class="button">Upload New Video</a>
      </div>
      
      ${videos.length > 0 ? `
        <div class="grid">
          ${videos.map(video => `
            <div class="card" onclick="location.href='/video/${video.id}'">
              ${video.thumbnail ? `<img src="/${video.thumbnail}" alt="${video.title}" loading="lazy" />` : ''}
              <div class="card-content">
                <h3>${video.title}</h3>
                <p>${video.description.substring(0, 50)}${video.description.length > 50 ? '...' : ''}</p>
                <p class="timestamp">${new Date(video.createdAt).toLocaleString()}</p>
              </div>
            </div>
          `).join('')}
        </div>
      ` : '<p class="center-content">No videos uploaded yet.</p>'}
    </section>
  `;
  
  res.send(renderPage('Videos', content, req));
});

app.get("/upload/video", (req, res) => {
  const content = `
    <section>
      <h2 class="center-content">Upload Video</h2>
      <form class="form-container" action="/upload/video" method="POST" enctype="multipart/form-data">
        <div class="form-group">
          <label for="title">Title</label>
          <input type="text" id="title" name="title" required>
        </div>
        
        <div class="form-group">
          <label for="description">Description</label>
          <textarea id="description" name="description" required></textarea>
        </div>
        
        <div class="form-group">
          <label for="video">Video File (MP4, WEBM, MOV - max 100MB)</label>
          <input type="file" id="video" name="video" accept="video/mp4,video/webm,video/quicktime" required>
        </div>
        
        <div class="form-group">
          <label for="thumbnail">Thumbnail Image (Optional)</label>
          <input type="file" id="thumbnail" name="thumbnail" accept="image/*">
        </div>
        
        <button type="submit" class="button">Upload Video</button>
      </form>
    </section>
  `;
  
  res.send(renderPage('Upload Video', content, req));
});

app.post("/upload/video", (req, res, next) => {
  videoUpload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ])(req, res, (err) => {
    if (err) return next(err);
    
    const { title, description } = req.body;
    const videoFile = req.files["video"]?.[0];
    
    if (!videoFile) {
      return res.status(400).send(renderPage('Error', '<p class="error">Video file is required.</p>', req));
    }
    
    const data = loadData();
    const id = Date.now().toString();
    const thumbFile = req.files["thumbnail"]?.[0];
    
    data.videos.push({
      id,
      title,
      description,
      video: videoFile.filename,
      thumbnail: thumbFile ? thumbFile.filename : null,
      comments: [],
      createdAt: new Date().toISOString()
    });
    
    saveData(data);
    res.send(renderPage('Success', '<p class="success">Video uploaded successfully!</p><a href="/video/' + id + '" class="button">View Video</a>', req));
  });
});

app.get("/video/:id", (req, res) => {
  const data = loadData();
  const video = data.videos.find(v => v.id === req.params.id);
  
  if (!video) {
    return res.status(404).send(renderPage('Not Found', '<p class="error">Video not found.</p>', req));
  }
  
  const comments = video.comments.map(c => `
    <div class="comment">
      <div class="comment-author">${c.name}</div>
      <div class="comment-text">${c.text}</div>
      <div class="comment-date">${new Date(c.createdAt).toLocaleString()}</div>
    </div>
  `).join('');
  
  const content = `
    <section>
      <div class="center-content">
        <h2>${video.title}</h2>
        <p>${video.description}</p>
      </div>
      
      <div class="video-player">
        <video controls>
          <source src="/${video.video}" type="video/mp4">
          Your browser does not support the video tag.
        </video>
      </div>
      
      <div class="comments">
        <h3>Comments (${video.comments.length})</h3>
        ${comments || '<p>No comments yet.</p>'}
        
        <form class="form-container" method="POST" action="/video/${video.id}/comment">
          <div class="form-group">
            <label for="name">Your Name</label>
            <input type="text" id="name" name="name" required>
          </div>
          
          <div class="form-group">
            <label for="text">Your Comment</label>
            <textarea id="text" name="text" required></textarea>
          </div>
          
          <button type="submit" class="button">Post Comment</button>
        </form>
      </div>
    </section>
  `;
  
  res.send(renderPage(video.title, content, req));
});

app.post("/video/:id/comment", (req, res) => {
  const { name, text } = req.body;
  const data = loadData();
  const video = data.videos.find(v => v.id === req.params.id);
  
  if (!video) {
    return res.status(404).send(renderPage('Not Found', '<p class="error">Video not found.</p>', req));
  }
  
  if (!name || !text) {
    return res.status(400).send(renderPage('Error', '<p class="error">Name and comment text are required.</p>', req));
  }
  
  video.comments.push({
    name,
    text,
    createdAt: new Date().toISOString()
  });
  
  saveData(data);
  res.redirect("/video/" + video.id);
});

// Image routes
app.get("/images", (req, res) => {
  const data = loadData();
  const images = data.images.reverse();
  
  const content = `
    <section>
      <h2 class="center-content">All Images</h2>
      <div class="center-content" style="margin-bottom: 1rem;">
        <a href="/upload/image" class="button">Upload New Image</a>
      </div>
      
      ${images.length > 0 ? `
        <div class="grid">
          ${images.map(image => `
            <div class="card" onclick="location.href='/image/${image.filename}'">
              <img src="/${image.filename}" alt="Uploaded image" loading="lazy" />
              <div class="card-content">
                <p class="timestamp">${new Date(image.uploadedAt).toLocaleString()}</p>
              </div>
            </div>
          `).join('')}
        </div>
      ` : '<p class="center-content">No images uploaded yet.</p>'}
    </section>
  `;
  
  res.send(renderPage('Images', content, req));
});

app.get("/upload/image", (req, res) => {
  const content = `
    <section>
      <h2 class="center-content">Upload Image</h2>
      <form class="form-container" action="/upload/image" method="POST" enctype="multipart/form-data">
        <div class="form-group">
          <label for="image">Image File (JPEG, PNG, GIF - max 20MB)</label>
          <input type="file" id="image" name="image" accept="image/*" required>
        </div>
        
        <button type="submit" class="button">Upload Image</button>
      </form>
    </section>
  `;
  
  res.send(renderPage('Upload Image', content, req));
});

app.post("/upload/image", (req, res, next) => {
  imageUpload.single('image')(req, res, (err) => {
    if (err) return next(err);
    
    if (!req.file) {
      return res.status(400).send(renderPage('Error', '<p class="error">Image file is required.</p>', req));
    }
    
    const data = loadData();
    data.images.push({
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      uploadedAt: new Date().toISOString()
    });
    
    saveData(data);
    res.send(renderPage('Success', '<p class="success">Image uploaded successfully!</p><a href="/image/' + req.file.filename + '" class="button">View Image</a>', req));
  });
});

app.get("/image/:filename", (req, res) => {
  const data = loadData();
  const image = data.images.find(img => img.filename === req.params.filename);
  
  if (!image) {
    return res.status(404).send(renderPage('Not Found', '<p class="error">Image not found.</p>', req));
  }
  
  const content = `
    <section>
      <div class="center-content">
        <h2>Image</h2>
      </div>
      
      <div style="max-width: 100%; overflow: hidden; border-radius: 0.5rem; margin: 1rem 0; display: flex; justify-content: center;">
        <img src="/${image.filename}" alt="Uploaded image" style="max-width: 100%; max-height: 80vh; height: auto; display: block;">
      </div>
      
      <div class="paste-container">
        <p><strong>Original name:</strong> ${image.originalName}</p>
        <p><strong>Size:</strong> ${(image.size / 1024).toFixed(2)} KB</p>
        <p><strong>Uploaded:</strong> ${new Date(image.uploadedAt).toLocaleString()}</p>
      </div>
    </section>
  `;
  
  res.send(renderPage('Image', content, req));
});

// Paste routes
app.get("/pastes", (req, res) => {
  const data = loadData();
  const pastes = data.pastes.reverse();
  
  const content = `
    <section>
      <h2 class="center-content">All Pastes</h2>
      <div class="center-content" style="margin-bottom: 1rem;">
        <a href="/upload/paste" class="button">Create New Paste</a>
      </div>
      
      ${pastes.length > 0 ? `
        <div class="grid">
          ${pastes.map(paste => `
            <div class="card" onclick="location.href='/paste/${paste.id}'">
              <div class="card-content">
                <h3>${paste.title}</h3>
                <p>${paste.code.substring(0, 50)}${paste.code.length > 50 ? '...' : ''}</p>
                <p class="timestamp">${new Date(paste.createdAt).toLocaleString()}</p>
              </div>
            </div>
          `).join('')}
        </div>
      ` : '<p class="center-content">No pastes created yet.</p>'}
    </section>
  `;
  
  res.send(renderPage('Pastes', content, req));
});

app.get("/upload/paste", (req, res) => {
  const content = `
    <section>
      <h2 class="center-content">Create New Paste</h2>
      <form class="form-container" method="POST" action="/upload/paste">
        <div class="form-group">
          <label for="title">Title</label>
          <input type="text" id="title" name="title" required>
        </div>
        
        <div class="form-group">
          <label for="code">Code</label>
          <textarea id="code" name="code" required></textarea>
        </div>
        
        <button type="submit" class="button">Create Paste</button>
      </form>
    </section>
  `;
  
  res.send(renderPage('Create Paste', content, req));
});

app.post("/upload/paste", (req, res) => {
  const { title, code } = req.body;
  
  if (!title || !code) {
    return res.status(400).send(renderPage('Error', '<p class="error">Title and code are required.</p>', req));
  }
  
  const data = loadData();
  const id = Date.now().toString();
  
  data.pastes.push({
    id,
    title,
    code,
    createdAt: new Date().toISOString()
  });
  
  saveData(data);
  res.send(renderPage('Success', '<p class="success">Paste created successfully!</p><a href="/paste/' + id + '" class="button">View Paste</a>', req));
});

app.get("/paste/:id", (req, res) => {
  const data = loadData();
  const paste = data.pastes.find(p => p.id === req.params.id);
  
  if (!paste) {
    return res.status(404).send(renderPage('Not Found', '<p class="error">Paste not found.</p>', req));
  }
  
  const filename = `${paste.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${paste.id.slice(-6)}.txt`;
  
  const content = `
    <section>
      <div class="center-content">
        <h2>${paste.title}</h2>
        <p style="color: var(--text-secondary); margin-bottom: 1rem;">
          Created: ${new Date(paste.createdAt).toLocaleString()}
        </p>
      </div>
      
      <div class="paste-container">
        <pre>${escapeHtml(paste.code)}</pre>
      </div>
      
      <div class="center-content">
        <div class="paste-actions">
          <button onclick="copyToClipboard(\`${escapeHtml(paste.code.replace(/`/g, '\\`'))}\`)" class="button">
            Copy to Clipboard
          </button>
          <button onclick="downloadPaste(\`${escapeHtml(paste.code.replace(/`/g, '\\`'))}\`, \`${filename}\`)" class="button button-outline">
            Download Paste
          </button>
          <a href="/paste/${paste.id}/raw" target="_blank" class="button button-outline">
            View Raw
          </a>
        </div>
      </div>
    </section>
  `;
  
  res.send(renderPage(paste.title, content, req));
});

app.get("/paste/:id/raw", (req, res) => {
  const data = loadData();
  const paste = data.pastes.find(p => p.id === req.params.id);
  
  if (!paste) {
    return res.status(404).send('Paste not found');
  }
  
  res.type('text/plain');
  res.send(paste.code);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Upload directory: ${uploadDir}`);
  console.log(`Data file: ${dataFile}`);
});
