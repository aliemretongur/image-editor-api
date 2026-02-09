const express = require('express');
const multer = require('multer');
const { createCanvas, loadImage, registerFont } = require('canvas');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const PORT = process.env.PORT || 3000;

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

    // Add text with better settings
    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'bottom';
    
    // Use system font that supports Turkish characters
    const fontSize = Math.max(24, Math.min(48, width / 15)); // Responsive font size
    ctx.font = `bold ${fontSize}px "DejaVu Sans", "Arial Unicode MS", Arial, sans-serif`;
    
    // Text wrapping
    const maxWidth = width - 100; // 50px padding on each side
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

    // Convert to buffer
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
