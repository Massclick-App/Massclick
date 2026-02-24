const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputFolder = path.join(__dirname, 'src/assets/images');

const outputFolder = path.join(__dirname, 'src/assets/images/webp');

if (!fs.existsSync(outputFolder)) {
  fs.mkdirSync(outputFolder, { recursive: true });
}

fs.readdirSync(inputFolder).forEach(file => {

  if (/\.(png|jpg|jpeg)$/i.test(file)) {

    const inputPath = path.join(inputFolder, file);

    const outputPath = path.join(
      outputFolder,
      file.replace(/\.(png|jpg|jpeg)$/i, '.webp')
    );

    sharp(inputPath)
      .resize(68, 68) 
      .webp({ quality: 60 })
      .toFile(outputPath)
      .then(() => console.log(`✅ Optimized: ${file}`))
      .catch(err => console.log(`❌ Error: ${file}`, err));

  }

});
