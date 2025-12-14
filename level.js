// Obstacle Types
export const OBS = {
    EMPTY: 0,
    BLOCK: 1,
    SPIKE: 2,
    PLATFORM_LOW: 3,
    PLATFORM_HIGH: 4,
    GAP: 5
};

// Procedural Patterns
const PATTERNS = {
    EASY: [
        "........",
        "....S...",
        "........",
        "..S.....",
        "........",
        "...B....",
        "........",
        "...P...."
    ],
    MEDIUM: [
        "..SS....",
        ".S.S.S..",
        ".B.S.B..",
        ".P.S.P..",
        "........",
        "...GG..."
    ],
    HARD: [
        ".SSS....",
        "SS.SS...",
        "B.S.B.S.",
        "S.P.S.P.",
        ".G.G.G.",
        "P.G.P.G."
    ],
    INSANE: [
        "SSS.SSS.",
        "B.SS.B.S",
        "PG.PG.PG",
        "G.S.G.S.",
        "B.B.B.B."
    ]
};

export class Level {
    constructor(groundY) {
        this.groundY = groundY;
        this.tileSize = 40; // Base grid unit
        this.obstacles = [];
        this.currentX = 0; // The frontier of generation
        
        // Initial safe zone
        this.currentX = 500; // Start offset
        this.addRawSegment(".".repeat(50)); // Longer safe start
    }

    update(cameraX, width, difficultyScore) {
        // 1. Generate new chunks if near edge
        const buffer = 1500; // Generate further ahead
        if (this.currentX < cameraX + width + buffer) {
            this.generateChunk(difficultyScore);
        }

        // 2. Cleanup old chunks
        const removeThreshold = cameraX - 500;
        if (this.obstacles.length > 0 && this.obstacles[0].x < removeThreshold) {
            // Remove obstacles that are far behind
            this.obstacles = this.obstacles.filter(o => o.x >= removeThreshold);
        }
    }

    generateChunk(difficulty) {
        // Difficulty (distance in meters)
        let pool = PATTERNS.EASY;
        
        // Progression slowed down significantly
        if (difficulty > 200) pool = pool.concat(PATTERNS.MEDIUM);
        if (difficulty > 1000) pool = PATTERNS.MEDIUM.concat(PATTERNS.HARD);
        if (difficulty > 2500) pool = PATTERNS.HARD.concat(PATTERNS.INSANE);

        // Pick random pattern
        const pattern = pool[Math.floor(Math.random() * pool.length)];
        
        // Sometimes add a small breather between patterns
        this.addRawSegment("..."); 
        this.addRawSegment(pattern);
    }

    addRawSegment(mapString) {
        for (let char of mapString) {
            let type = OBS.EMPTY;
            if (char === 'S') type = OBS.SPIKE;
            if (char === 'B') type = OBS.BLOCK;
            if (char === 'P') type = OBS.PLATFORM_LOW;
            if (char === 'G') type = OBS.GAP;

            if (type !== OBS.EMPTY) {
                let obs = {
                    type: type,
                    x: this.currentX,
                    y: 0, 
                    w: this.tileSize,
                    h: this.tileSize,
                    passed: false
                };

                // Finalize Y positions
                if (obs.type === OBS.BLOCK) obs.y = this.groundY - obs.h;
                if (obs.type === OBS.SPIKE) {
                    obs.y = this.groundY - obs.h;
                    obs.w = 30; // Spikes are thinner
                }
                if (obs.type === OBS.PLATFORM_LOW) obs.y = this.groundY - obs.h * 2.5;
                if (obs.type === OBS.GAP) {
                    obs.y = this.groundY; // Floor gap
                    obs.h = 200; // Deep pit
                }

                this.obstacles.push(obs);
            }
            this.currentX += this.tileSize;
        }
    }

    draw(ctx, cameraX, width) {
        // Draw Floor
        let floorStart = Math.max(0, cameraX - 100);
        let floorEnd = cameraX + width + 100;
        
        // Draw floor normally
        ctx.fillStyle = "#eee";
        ctx.fillRect(floorStart, this.groundY, floorEnd - floorStart, 2); 
        
        // Find gaps in view to erase floor
        let gaps = this.obstacles.filter(o => o.type === OBS.GAP && o.x + o.w > floorStart && o.x < floorEnd);
        
        // Draw Gaps (Black out floor)
        ctx.fillStyle = "#050505"; // Match BG
        gaps.forEach(g => {
            ctx.fillRect(g.x, this.groundY - 1, g.w + 1, 10); 
        });

        // Draw Obstacles
        this.obstacles.forEach(obs => {
            if (obs.x + obs.w < cameraX || obs.x > cameraX + width) return;
            
            const drawX = obs.x - cameraX;

            if (obs.type === OBS.BLOCK) {
                ctx.fillStyle = "#00f3ff"; // Cyan
                ctx.shadowBlur = 10;
                ctx.shadowColor = "#00f3ff";
                ctx.fillRect(drawX, obs.y, obs.w, obs.h);
                ctx.strokeStyle = "rgba(255,255,255,0.5)";
                ctx.strokeRect(drawX, obs.y, obs.w, obs.h);
            } else if (obs.type === OBS.SPIKE) {
                ctx.fillStyle = "#ff00ff"; // Magenta
                ctx.shadowBlur = 10;
                ctx.shadowColor = "#ff00ff";
                ctx.beginPath();
                ctx.moveTo(drawX, obs.y + obs.h);
                ctx.lineTo(drawX + obs.w/2, obs.y);
                ctx.lineTo(drawX + obs.w, obs.y + obs.h);
                ctx.fill();
            } else if (obs.type === OBS.PLATFORM_LOW) {
                ctx.fillStyle = "#fffa00"; // Yellow
                ctx.shadowBlur = 10;
                ctx.shadowColor = "#fffa00";
                ctx.fillRect(drawX, obs.y, obs.w, 10); // Thin platform
            }
            
            ctx.shadowBlur = 0;
        });
    }

    checkCollision(player) {
        const pb = player.getBounds();
        
        // Floor collision
        let overGap = false;
        
        for (let obs of this.obstacles) {
            // Optimization: Skip far objects
            if (obs.x > pb.x + pb.w + 50 || obs.x + obs.w < pb.x - 50) continue;

            // 1. Pit/Gap Logic
            if (obs.type === OBS.GAP) {
                // If player center is within gap X range
                const pCenter = pb.x + pb.w/2;
                if (pCenter > obs.x && pCenter < obs.x + obs.w) {
                    overGap = true;
                }
            }

            // 2. Solid Block / Platform Logic
            if (obs.type === OBS.BLOCK || obs.type === OBS.PLATFORM_LOW) {
                if (pb.x < obs.x + obs.w &&
                    pb.x + pb.w > obs.x &&
                    pb.y < obs.y + obs.h &&
                    pb.y + pb.h > obs.y) {
                    
                    // Collision detected
                    // Determine side
                    const overlapY = (pb.y + pb.h) - obs.y;
                    const overlapX = (pb.x + pb.w) - obs.x;
                    
                    // If hitting top (Landing)
                    // We check if the player was previously above the object 
                    // (But simplified: if vertical overlap is small and we are falling)
                    if (overlapY < 20 && player.dy >= 0 && pb.y + pb.h - player.dy <= obs.y + 10) {
                        player.y = obs.y - pb.h;
                        player.dy = 0;
                        player.onGround = true;
                        // Snap rotation
                        player.rotation = Math.round(player.rotation / (Math.PI/2)) * (Math.PI/2);
                    } else {
                        // Hitting side or bottom -> Death
                        return true;
                    }
                }
            }

            // 3. Spike Logic (Hitbox is smaller than visual)
            if (obs.type === OBS.SPIKE) {
                // Shrink hitbox for fairness
                const pad = 6;
                if (pb.x + pad < obs.x + obs.w - pad &&
                    pb.x + pb.w - pad > obs.x + pad &&
                    pb.y + pad < obs.y + obs.h - pad &&
                    pb.y + pb.h - pad > obs.y + pad) {
                    return true;
                }
            }
        }

        // Handle falling off world (Gap or just plain falling)
        if (overGap && player.y >= this.groundY - pb.h) {
            // Allow falling
        } else if (player.y >= this.groundY - pb.h && !overGap) {
            // Hit floor
            player.y = this.groundY - pb.h;
            player.dy = 0;
            player.onGround = true;
        }

        if (player.y > this.groundY + 100) return true; // Fell into void

        return false;
    }
}