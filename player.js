export class Player {
    constructor(x, groundY, color) {
        this.startX = x;
        this.groundY = groundY;
        this.size = 30;
        this.color = color;

        this.reset();

        // Physics constants
        // Tuned for 140 BPM rhythm
        this.speed = 8.5; 
        this.jumpForce = -13; 
        this.gravity = 0.65;

        this.trail = [];
        this.maxTrail = 10;
    }

    reset() {
        this.x = this.startX;
        this.y = this.groundY - this.size;
        this.dy = 0;
        this.onGround = true;
        this.rotation = 0;
        this.isDead = false;
        this.trail = [];
    }

    jump() {
        if (this.onGround) {
            this.dy = this.jumpForce;
            this.onGround = false;
            return true; // Jump successful
        }
        return false;
    }

    update() {
        if (this.isDead) return;

        // Apply gravity
        this.dy += this.gravity;
        this.y += this.dy;

        // Move forward
        this.x += this.speed;

        // Rotate while jumping
        if (!this.onGround) {
            this.rotation += 0.15;
        } else {
            // Snap to nearest 90 deg when on ground
            const snap = Math.round(this.rotation / (Math.PI / 2)) * (Math.PI / 2);
            this.rotation = this.rotation * 0.8 + snap * 0.2;
        }

        // Trail logic
        if (Date.now() % 2 === 0) { // Add trail point every few frames
            this.trail.push({x: this.x, y: this.y, rot: this.rotation, alpha: 0.6});
            if (this.trail.length > this.maxTrail) this.trail.shift();
        }
    }

    draw(ctx, cameraX) {
        const drawX = this.x - cameraX;

        // Draw Trail
        ctx.fillStyle = this.color;
        for (let i = 0; i < this.trail.length; i++) {
            const t = this.trail[i];
            const tDrawX = t.x - cameraX;
            // Don't draw if off screen
            if (tDrawX < -50 || tDrawX > ctx.canvas.width + 50) continue;

            const scale = (i / this.maxTrail);
            ctx.globalAlpha = t.alpha * scale * 0.5;

            ctx.save();
            ctx.translate(tDrawX + this.size/2, t.y + this.size/2);
            ctx.rotate(t.rot);
            ctx.fillRect(-this.size/2 * scale, -this.size/2 * scale, this.size * scale, this.size * scale);
            ctx.restore();
        }
        ctx.globalAlpha = 1;

        if (this.isDead) return;

        // Draw Player
        ctx.save();
        ctx.translate(drawX + this.size/2, this.y + this.size/2);
        ctx.rotate(this.rotation);

        // Glow
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;

        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);

        // Inner detail
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.size/2 + 4, -this.size/2 + 4, this.size - 8, this.size - 8);

        ctx.restore();

        // Reset shadow
        ctx.shadowBlur = 0;
    }

    // Simple AABB logic for getting the bounding box
    getBounds() {
        return {
            x: this.x,
            y: this.y,
            w: this.size,
            h: this.size
        };
    }
}