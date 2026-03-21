const fs = require('fs');
const path = require('path');

function getPngDimensions(filePath) {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(24);
    fs.readSync(fd, buffer, 0, 24, 0);
    fs.closeSync(fd);

    // Check PNG signature
    if (buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a') {
        return null;
    }

    // Read IHDR chunk
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
}

const files = [
    'grunt_dead.png',
    'player_walk.png',
    'grunt_walking.png'
];

files.forEach(f => {
    const p = path.join(process.cwd(), f);
    try {
        const dim = getPngDimensions(p);
        console.log(`${f}: ${dim ? `${dim.width}x${dim.height}` : 'Not a PNG'}`);
    } catch (e) {
        console.log(`${f}: Error ${e.message}`);
    }
});
