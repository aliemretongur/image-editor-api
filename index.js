const express = require('express');
const multer = require('multer');
const { createCanvas, loadImage } = require('canvas');

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

    // White gradient (bottom to top fade)
    const gradientHeight = 250;
    const gradient = ctx.createLinearGradient(0, height, 0, height - gradientHeight);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, height - gradientHeight, width, gradientHeight);

    // Add text
    ctx.fillStyle = 'black';
    ctx.font = 'bold 32px Arial';
    ctx.fillText(text, 50, height - 80);

    // Convert to buffer
    const buffer = canvas.toBuffer('image/jpeg');

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
