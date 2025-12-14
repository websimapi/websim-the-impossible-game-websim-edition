// Obstacle Types
export const OBS = {
    EMPTY: 0,
    BLOCK: 1,
    SPIKE: 2,
    PLATFORM_LOW: 3,
    PLATFORM_HIGH: 4,
    GAP: 5
};

export class Level {
    constructor(groundY) {
        this.groundY = groundY;
        this.tileSize = 40; // Base grid unit
        this.obstacles = [];
        this.length = 0;
        
        // Generate the "Impossible" level map
        this.generateLevel();
    }

    generateLevel() {
        // R = Regular Space, S = Spike, B = Block, P = Platform, G = Gap
        // Designed to sync with 140BPM approx at specific speed
        const map = [
            // Intro
            ..."...".repeat(5),
            ..."S...S...S...".split(''),
            ..."S.S.S.".split(''),
            ..."BB..BB..".split(''),
            // Beat drop
            ..."S.S.S.S.".split(''),
            ..."B.S.B.S.".split(''),
            ..."BBB...S...".split(''),
            // Platforms
            ..."P...P...P...".split(''),
            ..."P.S.P.S.P.".split(''),
            // Tricky part
            ..".SS..SS..".split(''),
            ..."B..B..B..".split(''),
            // The Gap
            ..."GGGG".split(''), // Big pit
            ..."...S...".split(''),
            // Fast section
            ..."S.S.S.S.S.S.S.".split(''),
            ..."P.P.P.P.".split(''),
            ..."B.B.B.B.".split(''),
            // Technical
            ..."SS.B.SS.B.".split(''),
            ..."P..S..P..S..".split(''),
            ..."BBB.S.BBB.S.".split(''),
            // Climax
            ..."S.S.B.B.P.P.S.S.".split(''),
            ..."GG.P.GG.P.".split(''),
            ..."S.S.S.S.S.S.S.S.".split(''),
            // Outro
            ..."................".split(''),
            "WIN"
        ];

        let currentX = 500; // Start offset

        for (let item of map) {
            let type = OBS.EMPTY;
            if (item === 'S') type = OBS.SPIKE;
            if (item === 'B') type = OBS.BLOCK;
            if (item === 'P') type = OBS.PLATFORM_LOW;
            if (item === 'G') type = OBS.GAP;
            if (item === 'WIN') {
                this.finishLineX = currentX;
                break;
            }

            if (type !== OBS.EMPTY) {
                this.obstacles.push({
                    type: type,
                    x: currentX,
                    y: 0, // Calculated below
                    w: this.tileSize,
                    h: this.tileSize,
                    passed: false
                });
            }
            
            // Advance X
            currentX += this.tileSize; 
        }
        
        this.totalDistance = currentX;

        // Finalize Y positions
        this.obstacles.forEach(obs => {
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
        });
    }

    draw(ctx, cameraX, width) {
        // Draw Floor
        ctx.fillStyle = "#fff";
        // Calculate floor segments to draw gapless floor except where gaps exist
        let floorStart = Math.max(0, cameraX - 100);
        let floorEnd = cameraX + width + 100;
        
        // Find gaps in view
        let gaps = this.obstacles.filter(o => o.type === OBS.GAP && o.x + o.w > floorStart && o.x < floorEnd);
        
        // Draw floor rects skipping gaps
        let drawCursor = floorStart;
        
        // Optimize: Draw one big floor rectangle, then "erase" gaps with black rects? 
        // Better: Draw floor normally, draw black rects for gaps (since bg is complex, black rect works if bg is dark)
        // Actually, let's just draw the floor line where there are NO gaps.
        
        ctx.fillStyle = "#eee";
        ctx.fillRect(floorStart, this.groundY, floorEnd - floorStart, 2); // Thin floor line
        
        // Draw Gaps (Black out floor)
        ctx.fillStyle = "#050505"; // Match BG
        gaps.forEach(g => {
            ctx.fillRect(g.x, this.groundY - 1, g.w + 1, 10); // +1 to cover seams
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

        // Draw Finish Line
        if (this.finishLineX > cameraX && this.finishLineX < cameraX + width) {
             const fx = this.finishLineX - cameraX;
             ctx.fillStyle = "white";
             ctx.fillRect(fx, this.groundY - 200, 10, 200);
             // Checkered flag effect
             for(let i=0; i<10; i++) {
                 ctx.fillStyle = i%2===0 ? "black" : "white";
                 ctx.fillRect(fx, this.groundY - 200 + (i*20), 10, 20);
             }
        }
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