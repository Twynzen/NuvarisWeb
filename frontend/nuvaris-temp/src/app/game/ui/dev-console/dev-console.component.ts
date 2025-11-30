import { Component, ElementRef, ViewChild, AfterViewInit, Input, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThreeEngineService } from '../../engine/three-engine.service';

interface ConsoleLog {
    type: 'info' | 'success' | 'warning' | 'error' | 'command';
    message: string;
    timestamp: string;
}

@Component({
    selector: 'app-dev-console',
    templateUrl: './dev-console.component.html',
    styleUrls: ['./dev-console.component.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule]
})
export class DevConsoleComponent implements AfterViewInit {
    @ViewChild('inputField') inputField!: ElementRef<HTMLInputElement>;
    @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;

    isVisible = false;
    inputValue = '';
    logs: ConsoleLog[] = [];
    commandHistory: string[] = [];
    historyIndex = -1;

    // Persistence key
    private readonly STORAGE_KEY = 'nuvaris_dev_console_last_cmd';

    constructor(private engineService: ThreeEngineService) {
        // Load last command
        const lastCmd = localStorage.getItem(this.STORAGE_KEY);
        if (lastCmd) {
            this.inputValue = lastCmd;
        }

        // Initial welcome message
        this.addLog('info', 'Nuvaris Developer Console v1.0');
        this.addLog('info', 'Type "help" for a list of commands.');
    }

    ngAfterViewInit() {
        // Focus input when visible
        if (this.isVisible) {
            setTimeout(() => this.inputField.nativeElement.focus(), 0);
        }
    }

    @HostListener('window:keydown', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent) {
        // Toggle Console: Ctrl + K
        if (event.ctrlKey && event.key.toLowerCase() === 'k') {
            event.preventDefault();
            this.toggleVisibility();
            return;
        }

        // If console is not visible, ignore other keys
        if (!this.isVisible) return;

        // History Navigation
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            this.navigateHistory('up');
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            this.navigateHistory('down');
        }
    }

    toggleVisibility() {
        this.isVisible = !this.isVisible;
        if (this.isVisible) {
            setTimeout(() => {
                this.inputField.nativeElement.focus();
                this.scrollToBottom();
            }, 0);
        }
    }

    onSubmit() {
        const command = this.inputValue.trim();
        if (!command) return;

        // Add to history
        this.addToHistory(command);

        // Save for persistence
        localStorage.setItem(this.STORAGE_KEY, command);

        // Log the command
        this.addLog('command', `> ${command}`);

        // Execute
        this.executeCommand(command);

        // Clear input but keep focus
        this.inputValue = '';
        this.historyIndex = -1;
        setTimeout(() => this.scrollToBottom(), 0);
    }

    private addToHistory(command: string) {
        // Remove if already exists to avoid duplicates at the end
        const index = this.commandHistory.indexOf(command);
        if (index > -1) {
            this.commandHistory.splice(index, 1);
        }
        this.commandHistory.push(command);
        // Limit history size
        if (this.commandHistory.length > 50) {
            this.commandHistory.shift();
        }
    }

    private navigateHistory(direction: 'up' | 'down') {
        if (this.commandHistory.length === 0) return;

        if (direction === 'up') {
            if (this.historyIndex < this.commandHistory.length - 1) {
                this.historyIndex++;
            }
        } else {
            if (this.historyIndex > -1) {
                this.historyIndex--;
            }
        }

        if (this.historyIndex === -1) {
            this.inputValue = '';
        } else {
            // History is stored oldest to newest, so we traverse from end
            const index = this.commandHistory.length - 1 - this.historyIndex;
            this.inputValue = this.commandHistory[index];
        }
    }

    private addLog(type: ConsoleLog['type'], message: string) {
        const now = new Date();
        const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

        this.logs.push({
            type,
            message,
            timestamp: timeString
        });

        // Limit log size
        if (this.logs.length > 100) {
            this.logs.shift();
        }

        setTimeout(() => this.scrollToBottom(), 0);
    }

    private scrollToBottom() {
        if (this.scrollContainer) {
            this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
        }
    }

    // --- Command Execution Logic ---

    private executeCommand(input: string) {
        const parts = input.split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);

        try {
            switch (cmd) {
                case 'help':
                    this.showHelp();
                    break;
                case 'clear':
                    this.logs = [];
                    this.addLog('info', 'Console cleared.');
                    break;
                case 'vel':
                    this.handleSpeed(args);
                    break;
                case 'god':
                    this.handleGodMode();
                    break;
                case 'health':
                    this.handleHealth(args);
                    break;
                case 'attack':
                    this.handleAutoAttack(args);
                    break;
                case 'dmg-multiplier':
                    this.handleDamageMultiplier(args);
                    break;
                case 'invisible':
                    this.handleInvisibility();
                    break;
                case 'killall':
                    this.handleKillAll();
                    break;
                case 'spawn':
                    this.handleSpawn(args);
                    break;
                case 'enemies':
                    this.handleBatchSpawn(args);
                    break;
                case 'spawn-wave':
                    this.handleSpawnWave();
                    break;
                case 'enemies-list':
                    this.handleEnemiesList();
                    break;
                case 'fps':
                    this.handleFps();
                    break;
                case 'debug':
                    this.handleDebugToggle();
                    break;
                case 'spawn-toggle':
                    this.handleSpawnToggle(args);
                    break;
                // Map commands
                case 'loadmap':
                    this.handleLoadMap(args);
                    break;
                case 'maps':
                    this.handleListMaps();
                    break;
                case 'mapinfo':
                    this.handleMapInfo();
                    break;
                case 'nebline':
                    this.handleFog(args);
                    break;
                case 'genmap':
                    this.handleGenerateMap(args);
                    break;
                case 'testlight':
                    this.handleTestLighting();
                    break;
                case 'roomstats':
                    this.handleRoomStats();
                    break;
                // Player-centered fog commands
                case 'fogradius':
                    this.handleFogRadius(args);
                    break;
                case 'fogcolor':
                    this.handleFogColor(args);
                    break;
                case 'fogstats':
                    this.handleFogStats();
                    break;
                default:
                    this.addLog('error', `Unknown command: "${cmd}". Type "help" for available commands.`);
            }
        } catch (e: any) {
            this.addLog('error', `Error executing command: ${e.message}`);
        }
    }

    // --- Command Handlers ---

    private showHelp() {
        const commands = [
            { cmd: 'help', desc: 'Show available commands' },
            { cmd: 'clear', desc: 'Clear console log' },
            { cmd: 'vel <value>', desc: 'Set game speed (e.g., 1.5)' },
            { cmd: 'god', desc: 'Toggle God Mode' },
            { cmd: 'health <value>', desc: 'Set player health' },
            { cmd: 'attack <true/false>', desc: 'Toggle auto-attack' },
            { cmd: 'dmg-multiplier <val>', desc: 'Set damage multiplier' },
            { cmd: 'invisible', desc: 'Toggle invisibility' },
            { cmd: 'killall', desc: 'Kill all enemies' },
            { cmd: 'spawn <type> [count]', desc: 'Spawn enemy (spider/worm)' },
            { cmd: 'enemies <count>', desc: 'Spawn N random enemies' },
            { cmd: 'spawn-wave', desc: 'Force spawn a wave' },
            { cmd: 'spawn-toggle <on/off>', desc: 'Toggle auto-spawn system' },
            { cmd: 'enemies-list', desc: 'List active enemies' },
            { cmd: 'debug', desc: 'Toggle debug visualization (colisiones)' },
            { cmd: 'fps', desc: 'Toggle FPS/Stats display' },
            { cmd: 'loadmap <name>', desc: 'Load a map by name' },
            { cmd: 'maps', desc: 'List available maps' },
            { cmd: 'mapinfo', desc: 'Show current map info' },
            { cmd: 'nebline <true/false>', desc: 'Toggle fog/nebline on or off' },
            { cmd: 'genmap [min] [max]', desc: 'Generate procedural map (default 5-10 rooms)' },
            { cmd: 'testlight', desc: 'Create test rooms to verify lighting system' },
            { cmd: 'roomstats', desc: 'Show room visibility system stats' },
            { cmd: 'fogradius <near> <far>', desc: 'Set fog clarity radius (near=full visible, far=full fog)' },
            { cmd: 'fogcolor <hex>', desc: 'Set fog color (e.g., fogcolor 0a0a0f or #0a0a0f)' },
            { cmd: 'fogstats', desc: 'Show player fog system stats' }
        ];

        this.addLog('info', '--- Available Commands ---');
        commands.forEach(c => {
            this.addLog('info', `${c.cmd.padEnd(20)} - ${c.desc}`);
        });
    }

    private handleSpeed(args: string[]) {
        if (args.length === 0) {
            throw new Error('Missing argument: speed value required.');
        }
        const speed = parseFloat(args[0]);
        if (isNaN(speed)) {
            throw new Error('Invalid argument: speed must be a number.');
        }
        this.engineService.setGameSpeed(speed);
        this.addLog('success', `Game speed set to ${speed}x`);
    }

    private handleGodMode() {
        const isGod = this.engineService.toggleGodMode();
        this.addLog('success', `God Mode: ${isGod ? 'ON' : 'OFF'}`);
    }

    private handleHealth(args: string[]) {
        if (args.length === 0) {
            throw new Error('Missing argument: health value required.');
        }
        const health = parseInt(args[0], 10);
        if (isNaN(health)) {
            throw new Error('Invalid argument: health must be a number.');
        }
        this.engineService.setPlayerHealth(health);
        this.addLog('success', `Player health set to ${health}`);
    }

    private handleAutoAttack(args: string[]) {
        if (args.length === 0) {
            throw new Error('Missing argument: true/false required.');
        }
        const enabled = args[0].toLowerCase() === 'true';
        this.engineService.toggleAutoShoot(enabled);
        this.addLog('success', `Auto-attack: ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }

    private handleDamageMultiplier(args: string[]) {
        if (args.length === 0) {
            throw new Error('Missing argument: multiplier value required.');
        }
        const mult = parseFloat(args[0]);
        if (isNaN(mult)) {
            throw new Error('Invalid argument: multiplier must be a number.');
        }
        this.engineService.setDamageMultiplier(mult);
        this.addLog('success', `Damage multiplier set to ${mult}x`);
    }

    private handleInvisibility() {
        const isInvisible = this.engineService.toggleInvisibility();
        this.addLog('success', `Invisibility: ${isInvisible ? 'ON' : 'OFF'}`);
    }

    private handleKillAll() {
        const count = this.engineService.killAllEnemies();
        this.addLog('success', `Killed ${count} enemies.`);
    }

    private handleSpawn(args: string[]) {
        if (args.length === 0) {
            throw new Error('Missing argument: enemy type required (spider/worm).');
        }
        const type = args[0].toLowerCase();
        const count = args.length > 1 ? parseInt(args[1], 10) : 1;

        if (isNaN(count)) {
            throw new Error('Invalid argument: count must be a number.');
        }

        this.engineService.spawnEnemy(type, count);
        this.addLog('success', `Spawned ${count} ${type}(s).`);
    }

    private handleBatchSpawn(args: string[]) {
        if (args.length === 0) {
            throw new Error('Missing argument: count required.');
        }
        const count = parseInt(args[0], 10);
        if (isNaN(count)) {
            throw new Error('Invalid argument: count must be a number.');
        }

        // Spawn random mix
        let spiders = 0;
        let worms = 0;
        for (let i = 0; i < count; i++) {
            if (Math.random() > 0.5) spiders++; else worms++;
        }

        if (spiders > 0) this.engineService.spawnEnemy('spider', spiders);
        if (worms > 0) this.engineService.spawnEnemy('worm', worms);

        this.addLog('success', `Spawned ${count} random enemies.`);
    }

    private handleSpawnWave() {
        this.engineService.spawnWave();
        this.addLog('success', 'Forced wave spawn.');
    }

    private handleEnemiesList() {
        const stats = this.engineService.getGameStats();
        this.addLog('info', `Active Enemies: ${stats.enemyCount}`);
        // Ideally we'd list types too, but basic count is a start
    }

    private handleFps() {
        // This would typically toggle a persistent display,
        // but for now let's just log current stats
        const stats = this.engineService.getGameStats();
        this.addLog('info', `FPS: ${stats.fps.toFixed(1)} | Enemies: ${stats.enemyCount} | Speed: ${stats.timeScale}x`);
    }

    private handleDebugToggle() {
        const isDebugOn = this.engineService.toggleDebugMode();
        this.addLog('success', `Debug Mode: ${isDebugOn ? 'ON' : 'OFF'}`);
    }

    private handleSpawnToggle(args: string[]) {
        if (args.length === 0) {
            throw new Error('Missing argument: on/off required.');
        }
        const enabled = args[0].toLowerCase() === 'on';
        this.engineService.toggleSpawning(enabled);
        this.addLog('success', `Auto-spawn: ${enabled ? 'ON' : 'OFF'}`);
    }

    // --- Map Commands ---

    private handleLoadMap(args: string[]) {
        if (args.length === 0) {
            throw new Error('Missing argument: map name required. Use "maps" to list available maps.');
        }
        const mapName = args[0].toLowerCase();

        this.addLog('info', `Loading map: ${mapName}...`);

        this.engineService.loadMapByName(mapName).then(() => {
            const info = this.engineService.getMapInfo();
            this.addLog('success', `Map "${mapName}" loaded successfully!`);
            this.addLog('info', `  Objects: ${info.objects} | Walls: ${info.walls} | Portals: ${info.portals}`);
        }).catch((err: Error) => {
            this.addLog('error', `Failed to load map: ${err.message}`);
            this.addLog('info', 'Use "maps" to see available maps.');
        });
    }

    private handleListMaps() {
        const maps = this.engineService.getAvailableMaps();
        const currentMap = this.engineService.getCurrentMapName();

        this.addLog('info', '--- Available Maps ---');
        maps.forEach(map => {
            const marker = map === currentMap ? ' (current)' : '';
            this.addLog('info', `  ${map}${marker}`);
        });
        this.addLog('info', '');
        this.addLog('info', 'Usage: loadmap <name>');
    }

    private handleMapInfo() {
        const info = this.engineService.getMapInfo();
        const currentMap = this.engineService.getCurrentMapName();

        this.addLog('info', '--- Current Map Info ---');
        this.addLog('info', `  Name: ${currentMap}`);
        this.addLog('info', `  Objects: ${info.objects}`);
        this.addLog('info', `  Walls: ${info.walls}`);
        this.addLog('info', `  Portals: ${info.portals}`);
    }

    // --- Fog/Nebline Command ---

    private handleFog(args: string[]) {
        if (args.length === 0) {
            // Toggle if no argument
            const currentState = this.engineService.isFogEnabled();
            const newState = this.engineService.setFog(!currentState);
            this.addLog('success', `Fog: ${newState ? 'ON' : 'OFF'}`);
            return;
        }

        const arg = args[0].toLowerCase();
        if (arg === 'true' || arg === 'on') {
            this.engineService.setFog(true);
            this.addLog('success', 'Fog: ON');
        } else if (arg === 'false' || arg === 'off') {
            this.engineService.setFog(false);
            this.addLog('success', 'Fog: OFF');
        } else {
            throw new Error('Invalid argument. Use: nebline true/false or nebline on/off');
        }
    }

    // --- Procedural Map Generation ---

    private handleGenerateMap(args: string[]) {
        const minRooms = args.length > 0 ? parseInt(args[0], 10) : 5;
        const maxRooms = args.length > 1 ? parseInt(args[1], 10) : 10;

        if (isNaN(minRooms) || isNaN(maxRooms)) {
            throw new Error('Invalid arguments. Usage: genmap [minRooms] [maxRooms]');
        }

        if (minRooms < 1 || maxRooms < minRooms) {
            throw new Error('Invalid range. minRooms must be >= 1 and maxRooms >= minRooms');
        }

        this.addLog('info', `Generating procedural map with ${minRooms}-${maxRooms} rooms...`);

        // Check templates first
        const templates = this.engineService.getAvailableTemplates();
        this.addLog('info', `  Available templates: ${templates.length > 0 ? templates.join(', ') : 'NONE (templates not loaded!)'}`);

        this.engineService.generateProceduralMap({
            minRooms,
            maxRooms,
            seed: Date.now().toString()
        }).then(() => {
            this.addLog('success', 'Procedural map generated successfully!');
            const stats = this.engineService.getRoomStats();
            if (stats) {
                this.addLog('info', `  Rooms: ${stats.roomCount} | Walls: ${stats.wallCount} | Current: ${stats.currentRoomId || 'none'}`);
            }
        }).catch((err: Error) => {
            this.addLog('error', `Failed to generate map: ${err.message}`);
        });
    }

    // --- Test Lighting System ---

    private handleTestLighting() {
        this.addLog('info', 'Creating test lighting scenario...');

        this.engineService.createTestLightingMap().then((result) => {
            this.addLog('success', `Test map created: ${result.roomCount} rooms`);
            this.addLog('info', `  Biomes: ${result.biomes.join(', ')}`);
            this.addLog('info', '  Walk between rooms to test lighting transitions!');
            this.addLog('info', '  Use "roomstats" to see current room info.');
        }).catch((err: Error) => {
            this.addLog('error', `Failed to create test map: ${err.message}`);
        });
    }

    // --- Room Stats ---

    private handleRoomStats() {
        const stats = this.engineService.getRoomStats();
        if (!stats) {
            this.addLog('warning', 'Room visibility system not initialized');
            return;
        }

        this.addLog('info', '--- Room Stats ---');
        this.addLog('info', `  Total Rooms: ${stats.roomCount}`);
        this.addLog('info', `  Visible Rooms: ${stats.visibleRoomCount}`);
        this.addLog('info', `  Wall Segments: ${stats.wallCount}`);
        this.addLog('info', `  Current Room: ${stats.currentRoomId || 'none (outside all rooms)'}`);
    }

    // --- Player Fog System Commands ---

    private handleFogRadius(args: string[]) {
        if (args.length === 0) {
            // Show current radius
            const radius = this.engineService.getFogRadius();
            this.addLog('info', `Current fog radius: near=${radius.near}, far=${radius.far}`);
            this.addLog('info', 'Usage: fogradius <near> <far>');
            return;
        }

        if (args.length < 2) {
            throw new Error('Missing arguments. Usage: fogradius <near> <far>');
        }

        const near = parseFloat(args[0]);
        const far = parseFloat(args[1]);

        if (isNaN(near) || isNaN(far)) {
            throw new Error('Invalid arguments. near and far must be numbers.');
        }

        if (near < 0 || far < 0) {
            throw new Error('Values must be positive.');
        }

        if (near >= far) {
            throw new Error('near must be less than far for proper gradient.');
        }

        const result = this.engineService.setFogRadius(near, far);
        this.addLog('success', `Fog radius set: near=${result.near}, far=${result.far}`);
        this.addLog('info', '  near = radius of full visibility around player');
        this.addLog('info', '  far = radius where fog is 100% opaque');
    }

    private handleFogColor(args: string[]) {
        if (args.length === 0) {
            // Show current color
            const color = this.engineService.getFogColor();
            this.addLog('info', `Current fog color: ${color}`);
            this.addLog('info', 'Usage: fogcolor <hex> (e.g., 0a0a0f or #0a0a0f)');
            return;
        }

        const colorArg = args[0];
        const result = this.engineService.setFogColor(colorArg);
        this.addLog('success', `Fog color set: ${result}`);
    }

    private handleFogStats() {
        const stats = this.engineService.getFogStats();

        this.addLog('info', '--- Player Fog System Stats ---');
        this.addLog('info', `  Enabled: ${stats.enabled ? 'YES' : 'NO'}`);
        this.addLog('info', `  Fog Near: ${stats.near} (full clarity radius)`);
        this.addLog('info', `  Fog Far: ${stats.far} (full fog radius)`);
        this.addLog('info', `  Color: ${stats.color}`);
        this.addLog('info', `  Materials with fog: ${stats.materials}`);
        this.addLog('info', '');
        this.addLog('info', 'Commands: fogradius <n> <f>, fogcolor <hex>, nebline on/off');
    }
}
