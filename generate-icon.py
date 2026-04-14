# -*- coding: utf-8 -*-
from PIL import Image, ImageDraw, ImageFont
import os

size = 256
img = Image.new('RGBA', (size, size), (30, 64, 175, 255))  # Blue background

draw = ImageDraw.Draw(img)

# Draw circle
padding = 20
draw.ellipse([padding, padding, size - padding, size - padding], fill=(30, 64, 175, 255))

# Draw inner circle (white)
inner = 40
draw.ellipse([inner, inner, size - inner, size - inner], fill=(255, 255, 255, 255))

# Draw "S" letter
try:
    font_large = ImageFont.truetype("arial.ttf", 140)
    font_small = ImageFont.truetype("arial.ttf", 28)
except:
    font_large = ImageFont.load_default()
    font_small = ImageFont.load_default()

# White S on blue circle
bbox = draw.textbbox((0, 0), 'S', font=font_large)
text_w = bbox[2] - bbox[0]
text_h = bbox[3] - bbox[1]
x = (size - text_w) // 2 - bbox[0]
y = (size - text_h) // 2 - bbox[1] - 10
draw.text((x, y), 'S', fill=(30, 64, 175, 255), font=font_large)

# Bottom text "SENKI"
bbox2 = draw.textbbox((0, 0), 'SENKI', font=font_small)
tw2 = bbox2[2] - bbox2[0]
th2 = bbox2[3] - bbox2[1]
draw.text(((size - tw2) // 2 - bbox2[0], size - 45), 'SENKI', fill=(255, 255, 255, 255), font=font_small)

os.makedirs('D:/Bom/public', exist_ok=True)

# Save as PNG first
img.save('D:/Bom/public/icon.png')

# Create ICO with multiple sizes
sizes = [256, 128, 64, 48, 32, 16]
imgs = []
for s in sizes:
    imgs.append(img.resize((s, s), Image.LANCZOS))

imgs[0].save(
    'D:/Bom/public/icon.ico',
    format='ICO',
    sizes=[(s, s) for s in sizes]
)

print('Icon created: D:/Bom/public/icon.png and icon.ico')
