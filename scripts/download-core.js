const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const binDir = path.join(__dirname, '..', 'bin');
const targetExe = path.join(binDir, 'sing-box.exe');

if (fs.existsSync(targetExe)) {
  console.log('✓ sing-box.exe already exists in bin/');
  process.exit(0);
}

if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

console.log('Downloading official sing-box Windows x64 core...');
const downloadUrl = 'https://github.com/SagerNet/sing-box/releases/download/v1.14.3/sing-box-1.14.3-windows-amd64.zip';
const zipPath = path.join(binDir, 'sing-box.zip');

function download(url, dest, cb) {
  const file = fs.createWriteStream(dest);
  https.get(url, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      return download(res.headers.location, dest, cb);
    }
    res.pipe(file);
    file.on('finish', () => {
      file.close(cb);
    });
  }).on('error', (err) => {
    fs.unlink(dest, () => {});
    if (cb) cb(err);
  });
}

download(downloadUrl, zipPath, (err) => {
  if (err) {
    console.error('Failed to download sing-box:', err.message);
    process.exit(1);
  }

  console.log('Extracting sing-box core...');
  try {
    const extractDir = path.join(binDir, 'temp_extract');
    execSync(`powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force; Copy-Item '${extractDir}/*/sing-box.exe' '${targetExe}' -Force; Remove-Item -Recurse -Force '${extractDir}', '${zipPath}'"`);
    console.log('✓ sing-box.exe installed successfully in bin/');
  } catch (ex) {
    console.error('Extraction error:', ex.message);
    process.exit(1);
  }
});
