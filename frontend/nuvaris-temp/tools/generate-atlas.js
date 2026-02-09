#!/usr/bin/env node
/**
 * NUVARIS Sprite Atlas Generator
 *
 * Converts individual PNG sprite frames into atlas sprite sheets with JSON metadata.
 * Usage: node tools/generate-atlas.js [--character proyecto-a] [--all] [--clean]
 *
 * Dependencies: sharp (npm install --save-dev sharp)
 */

const fs = require('fs');
const path = require('path');

let sharp;
try {
    sharp = require('sharp');
} catch {
    console.error('Error: sharp is not installed. Run: npm install --save-dev sharp');
    process.exit(1);
}

const ASSETS_DIR = path.join(__dirname, '..', 'src', 'assets');
const ATLAS_DIR = path.join(ASSETS_DIR, 'atlas');

// Characters and their animation folder structure
const CHARACTER_CONFIGS = {
    'proyecto-a': {
        prefix: 'proyecto-a',
        animations: [
            { folder: 'idle', prefix: 'proyecto-a-idle-' },
            { folder: 'up', prefix: 'proyecto-a-up-' },
            { folder: 'down', prefix: 'proyecto-a-down-' },
            { folder: 'left', prefix: 'proyecto-a-left-' },
            { folder: 'right', prefix: 'proyecto-a-right-' },
            { folder: 'up-left', prefix: 'proyecto-a-up-left-' },
            { folder: 'up-right', prefix: 'proyecto-a-up-right-' },
            { folder: 'down-left', prefix: 'proyecto-a-down-left-' },
            { folder: 'down-right', prefix: 'proyecto-a-down-right-' },
            { folder: 'attack/down', prefix: 'proyecto-a-attack-down-' },
            { folder: 'attack/left', prefix: 'proyecto-a-attack-left-' },
            { folder: 'attack/right', prefix: 'proyecto-a-attack-right-' },
            { folder: 'dead', prefix: 'proyecto-a-dead-' },
            { folder: 'shoot/down', prefix: 'proyecto-a-shoot-down-' },
            { folder: 'shoot/left', prefix: 'proyecto-a-shoot-left-' },
            { folder: 'shoot/right', prefix: 'proyecto-a-shoot-right-' },
            { folder: 'shoot/up', prefix: 'proyecto-a-shoot-up-' },
        ]
    },
    'lars': {
        prefix: 'lars',
        animations: [
            { folder: 'idle', prefix: 'lars-idle-' },
            { folder: 'up', prefix: 'lars-up-' },
            { folder: 'down', prefix: 'lars-down-' },
            { folder: 'left', prefix: 'lars-left-' },
            { folder: 'right', prefix: 'lars-right-' },
            { folder: 'up-left', prefix: 'lars-up-left-' },
            { folder: 'up-right', prefix: 'lars-up-right-' },
            { folder: 'down-left', prefix: 'lars-down-left-' },
            { folder: 'down-right', prefix: 'lars-down-right-' },
            { folder: 'dead', prefix: 'lars-dead-' },
        ]
    },
    'proyecto-y': {
        prefix: 'proyecto-y',
        animations: [
            { folder: 'idle', prefix: 'proyecto-y-idle-' },
            { folder: 'up', prefix: 'proyecto-y-up-' },
            { folder: 'down', prefix: 'proyecto-y-down-' },
            { folder: 'left', prefix: 'proyecto-y-left-' },
            { folder: 'right', prefix: 'proyecto-y-right-' },
            { folder: 'up-left', prefix: 'proyecto-y-up-left-' },
            { folder: 'up-right', prefix: 'proyecto-y-up-right-' },
            { folder: 'down-left', prefix: 'proyecto-y-down-left-' },
            { folder: 'down-right', prefix: 'proyecto-y-down-right-' },
            { folder: 'dead', prefix: 'proyecto-y-dead-' },
        ]
    }
};

// Enemy configs
const ENEMY_CONFIGS = {
    'spider': {
        prefix: 'spider',
        basePath: 'Enemys/spider',
        animations: [
            { folder: 'walk', prefix: 'spider-walk-' },
        ]
    },
    'intestine-worm': {
        prefix: 'intestine-worm',
        basePath: 'Enemys/intestine-worm',
        animations: [
            { folder: 'spawn', prefix: 'worm-spawn-' },
            { folder: 'idle', prefix: 'worm-idle-' },
            { folder: 'bury', prefix: 'worm-bury-' },
            { folder: 'emerge', prefix: 'worm-emerge-' },
            { folder: 'jump', prefix: 'worm-jump-' },
        ]
    }
};

/**
 * Calculate optimal grid layout for N frames
 * Prefers wider layouts (more columns than rows) for better GPU texture usage
 */
function calculateGrid(frameCount) {
    const cols = Math.ceil(Math.sqrt(frameCount));
    const rows = Math.ceil(frameCount / cols);
    return { cols, rows };
}

/**
 * Get sorted PNG files from a directory
 */
function getFrameFiles(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
        .filter(f => f.endsWith('.png'))
        .sort();
}

/**
 * Generate a sprite atlas from a folder of individual PNGs
 */
async function generateAtlas(sourceDir, outputName, animPrefix) {
    const files = getFrameFiles(sourceDir);
    if (files.length === 0) {
        console.log(`  SKIP: No PNGs in ${sourceDir}`);
        return null;
    }

    // Read first image to get dimensions
    const firstImage = sharp(path.join(sourceDir, files[0]));
    const metadata = await firstImage.metadata();
    const frameWidth = metadata.width;
    const frameHeight = metadata.height;
    const frameCount = files.length;

    const { cols, rows } = calculateGrid(frameCount);
    const atlasWidth = cols * frameWidth;
    const atlasHeight = rows * frameHeight;

    console.log(`  ${outputName}: ${frameCount} frames (${frameWidth}x${frameHeight}) -> ${cols}x${rows} atlas (${atlasWidth}x${atlasHeight})`);

    // Create composite operations
    const composites = [];
    for (let i = 0; i < frameCount; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        composites.push({
            input: path.join(sourceDir, files[i]),
            left: col * frameWidth,
            top: row * frameHeight,
        });
    }

    // Generate atlas image
    const atlasPath = path.join(ATLAS_DIR, `${outputName}.png`);
    await sharp({
        create: {
            width: atlasWidth,
            height: atlasHeight,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
    })
        .composite(composites)
        .png({ compressionLevel: 6 })
        .toFile(atlasPath);

    // Generate metadata JSON
    const frames = [];
    for (let i = 0; i < frameCount; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        frames.push({
            x: col * frameWidth,
            y: row * frameHeight,
            w: frameWidth,
            h: frameHeight
        });
    }

    const metadataObj = {
        image: `${outputName}.png`,
        frameWidth,
        frameHeight,
        columns: cols,
        rows,
        frameCount,
        atlasWidth,
        atlasHeight,
        frames
    };

    const metadataPath = path.join(ATLAS_DIR, `${outputName}.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadataObj, null, 2));

    const atlasStats = fs.statSync(atlasPath);
    const originalSize = files.reduce((sum, f) => sum + fs.statSync(path.join(sourceDir, f)).size, 0);
    console.log(`    Size: ${(originalSize / 1024).toFixed(0)}KB (${frameCount} files) -> ${(atlasStats.size / 1024).toFixed(0)}KB (1 atlas)`);

    return metadataObj;
}

/**
 * Process a character's animations
 */
async function processCharacter(charId) {
    const config = CHARACTER_CONFIGS[charId];
    if (!config) {
        console.error(`Unknown character: ${charId}`);
        return;
    }

    console.log(`\nProcessing character: ${charId}`);
    const charDir = path.join(ATLAS_DIR, config.prefix);
    if (!fs.existsSync(charDir)) {
        fs.mkdirSync(charDir, { recursive: true });
    }

    for (const anim of config.animations) {
        const sourceDir = path.join(ASSETS_DIR, config.prefix, anim.folder);
        const sanitizedFolder = anim.folder.replace(/\//g, '-');
        const outputName = `${config.prefix}/${config.prefix}-${sanitizedFolder}`;
        await generateAtlas(sourceDir, outputName, anim.prefix);
    }
}

/**
 * Process enemy animations
 */
async function processEnemy(enemyId) {
    const config = ENEMY_CONFIGS[enemyId];
    if (!config) {
        console.error(`Unknown enemy: ${enemyId}`);
        return;
    }

    console.log(`\nProcessing enemy: ${enemyId}`);
    const enemyDir = path.join(ATLAS_DIR, config.prefix);
    if (!fs.existsSync(enemyDir)) {
        fs.mkdirSync(enemyDir, { recursive: true });
    }

    for (const anim of config.animations) {
        const sourceDir = path.join(ASSETS_DIR, config.basePath, anim.folder);
        const outputName = `${config.prefix}/${config.prefix}-${anim.folder}`;
        await generateAtlas(sourceDir, outputName, anim.prefix);
    }
}

/**
 * Auto-discover animations for a character by scanning directories
 */
async function autoDiscoverAndGenerate(charId, basePath) {
    console.log(`\nAuto-discovering animations in: ${basePath}`);
    const charDir = path.join(ATLAS_DIR, charId);
    if (!fs.existsSync(charDir)) {
        fs.mkdirSync(charDir, { recursive: true });
    }

    async function scanDir(dir, prefix) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        const pngs = entries.filter(e => e.isFile() && e.name.endsWith('.png'));
        const subdirs = entries.filter(e => e.isDirectory());

        if (pngs.length > 0) {
            const relPath = path.relative(path.join(ASSETS_DIR, basePath), dir).replace(/\\/g, '/');
            const sanitized = relPath.replace(/\//g, '-');
            const outputName = `${charId}/${charId}-${sanitized}`;
            await generateAtlas(dir, outputName, prefix);
        }

        for (const sub of subdirs) {
            await scanDir(path.join(dir, sub.name), prefix);
        }
    }

    await scanDir(path.join(ASSETS_DIR, basePath), '');
}

// Main
async function main() {
    const args = process.argv.slice(2);
    const doAll = args.includes('--all');
    const doClean = args.includes('--clean');
    const charIndex = args.indexOf('--character');
    const charId = charIndex !== -1 ? args[charIndex + 1] : null;

    // Ensure atlas directory exists
    if (!fs.existsSync(ATLAS_DIR)) {
        fs.mkdirSync(ATLAS_DIR, { recursive: true });
    }

    if (doClean) {
        console.log('Cleaning atlas directory...');
        fs.rmSync(ATLAS_DIR, { recursive: true, force: true });
        fs.mkdirSync(ATLAS_DIR, { recursive: true });
    }

    console.log('=== NUVARIS Sprite Atlas Generator ===');
    console.log(`Assets: ${ASSETS_DIR}`);
    console.log(`Output: ${ATLAS_DIR}`);

    if (doAll) {
        // Process all characters and enemies
        for (const id of Object.keys(CHARACTER_CONFIGS)) {
            await processCharacter(id);
        }
        for (const id of Object.keys(ENEMY_CONFIGS)) {
            await processEnemy(id);
        }
    } else if (charId) {
        if (CHARACTER_CONFIGS[charId]) {
            await processCharacter(charId);
        } else if (ENEMY_CONFIGS[charId]) {
            await processEnemy(charId);
        } else {
            // Try auto-discovery
            await autoDiscoverAndGenerate(charId, charId);
        }
    } else {
        console.log('\nUsage:');
        console.log('  node generate-atlas.js --character proyecto-a   # Single character');
        console.log('  node generate-atlas.js --all                    # All characters + enemies');
        console.log('  node generate-atlas.js --all --clean            # Clean and regenerate all');
        console.log('\nAvailable characters:', Object.keys(CHARACTER_CONFIGS).join(', '));
        console.log('Available enemies:', Object.keys(ENEMY_CONFIGS).join(', '));
    }

    console.log('\nDone!');
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
