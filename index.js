const express = require('express');
const multer = require('multer');
const { createCanvas, loadImage } = require('canvas');
const https = require('https');
const http = require('http');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const PORT = process.env.PORT || 3000;

// Helper function to load image from URL
async function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        loadImage(buffer).then(resolve).catch(reject);
      });
    }).on('error', reject);
  });
}

// Test endpoint
app.get('/', (req, res) => {
  res.json({ status: 'Image Editor API is running!' });
});

// Image editing endpoint
app.post('/edit-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const text = req.body.text || 'Default Text';
    const logoUrl = req.body.logo_url || null;
    
    // Load image
    const img = await loadImage(req.file.buffer);
    const width = img.width;
    const height = img.height;

    // Create canvas
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Draw original image
    ctx.drawImage(img, 0, 0);

    // White gradient (bottom 200px, more subtle)
    const gradientHeight = 200;
    const gradient = ctx.createLinearGradient(0, height, 0, height - gradientHeight);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.7)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, height - gradientHeight, width, gradientHeight);

    // Add logo if provided
    if (logoUrl) {
      try {
        const logo = await loadImageFromUrl(logoUrl);
        const logoMaxHeight = 80;
        const logoMaxWidth = 150;
        
        let logoWidth = logo.width;
        let logoHeight = logo.height;
        
        // Resize logo to fit
        if (logoHeight > logoMaxHeight) {
          logoWidth = (logoMaxHeight / logoHeight) * logoWidth;
          logoHeight = logoMaxHeight;
        }
        if (logoWidth > logoMaxWidth) {
          logoHeight = (logoMaxWidth / logoWidth) * logoHeight;
          logoWidth = logoMaxWidth;
        }
        
        // Draw logo at bottom-right
        const logoX = width - logoWidth - 30;
        const logoY = height - logoHeight - 30;
        ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
      } catch (logoError) {
        console.error('Logo load error:', logoError);
        // Continue without logo if it fails
      }
    }

    // FONT AYARLARI - Türkçe karakter desteği için
    const fontSize = Math.max(24, Math.min(48, width / 15));
    
    // Birden fazla font deneyeceğiz
    const fonts = [
      `bold ${fontSize}px "Noto Sans"`,
      `bold ${fontSize}px "DejaVu Sans"`,
      `bold ${fontSize}px "Liberation Sans"`,
      `bold ${fontSize}px "FreeSans"`,
      `bold ${fontSize}px sans-serif`
    ];
    
    // İlk çalışan fontu kullan
    ctx.font = fonts[0];
    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'bottom';
    
    // Text wrapping
    const maxWidth = width - 100;
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const testLine = currentLine + ' ' + words[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);

    // Draw text lines from bottom
    const lineHeight = fontSize * 1.2;
    const startY = height - 50;
    
    lines.reverse().forEach((line, index) => {
      const y = startY - (index * lineHeight);
      ctx.fillText(line, 50, y);
    });

    // Convert to buffer (EN SONDA!)
    const buffer = canvas.toBuffer('image/jpeg', { quality: 0.95 });

    // Send image
    res.set('Content-Type', 'image/jpeg');
    res.send(buffer);

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
