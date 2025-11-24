// Format: [imagePath, maskPath, timeInSeconds]
const GAME_INSTANCES = [
    ['1.png', '1_mask.png', 20],
    ['2.png', '2_mask.png', 15],
    ['3.png', '3_mask.png', 15],
    ['4.png', '4_mask.png', 15],
    ['5.png', '5_mask.png', 10],
    // ['6.png', '6_mask.png', 10],
];

const GLOBAL_TEXT_SIZE = 72; // global default text size

let currentInstanceIndex = 0;
let resultsLog = [];
let currentGameState = null;
let displayResultsTime = 0;
let isDisplayingResults = false;

function setup() {
    smooth();
    frameRate(60);
    let width = windowWidth;
    let height = windowHeight;
    createCanvas(width, height);
    
    // initialize first instance
    initializeInstance(0);
}

function draw() {
    background(0);
    
    if (currentGameState) {   
        currentGameState.draw();
        // draw HIT counter top-right
        drawHitCounter();
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function mouseClicked() {
    if (!isDisplayingResults && currentGameState) {
        currentGameState.mouseClicked();
    }
}

function keyPressed() {
    if (!isDisplayingResults && currentGameState) {
        currentGameState.keyPressed();
    }
}

// -------------------- utility: centralized text drawing --------------------
function drawText(txt, x, y, opts = {}) {
    // opts: { size, alignH, alignV, col }
    const size = (opts.size !== undefined) ? opts.size : GLOBAL_TEXT_SIZE;
    const alignH = (opts.alignH !== undefined) ? opts.alignH : CENTER;
    const alignV = (opts.alignV !== undefined) ? opts.alignV : CENTER;
    const col = (opts.col !== undefined) ? opts.col : color(255);
    push();
    textAlign(alignH, alignV);
    textSize(size);
    fill(col);
    noStroke();
    text(txt, x, y);
    pop();
}

function drawHitCounter() {
    // show index+1 of current game instance in top-right corner
    const hitText = 'HIT: ' + (currentInstanceIndex + 1);
    drawText(hitText, windowWidth - 100, 70, { size: GLOBAL_TEXT_SIZE, alignH: RIGHT, alignV: TOP, col: color(255) });
}

// -------------------- instance management --------------------

function initializeInstance(index) {
    if (index >= GAME_INSTANCES.length) {
        onAllInstancesComplete();
        return;
    }
    
    const [imgPath, maskPath, timeSeconds] = GAME_INSTANCES[index];
    console.log(`Initializing instance ${index + 1}: ${imgPath}`);
    
    currentInstanceIndex = index;
    currentGameState = new GameInstance(imgPath, maskPath, timeSeconds * 1000);
    isDisplayingResults = false;
}

function onInstanceComplete(accuracy) {
    console.log(`Instance ${currentInstanceIndex + 1} completed with accuracy: ${accuracy}%`);
    resultsLog.push(accuracy);
    
    isDisplayingResults = true;
    displayResultsTime = millis();
    
    // launch next instance after 2 second delay
    setTimeout(() => {
        currentInstanceIndex++;
        if (currentInstanceIndex < GAME_INSTANCES.length) {
            initializeInstance(currentInstanceIndex);
        } else {
            onAllInstancesComplete();
        }
    }, 2000);
}

function onAllInstancesComplete() {
    console.log('All instances complete!');
    console.log('Results:', resultsLog);
    currentGameState = null;
    isDisplayingResults = true;
}

// -------------------- GameInstance class --------------------

class GameInstance {
    constructor(imgPath, maskPath, timeMs) {
        this.imgPath = imgPath;
        this.maskPath = maskPath;
        this.timeMs = timeMs;
        
        this.points = [];
        this.edges = [];
        this.loadedImage = null;
        this.loadedMask = null;
        
        this.timerStartMillis = 0;
        this.timerRunning = false;
        this.timeLeft = timeMs;
        this.allowInteraction = true;
        this.accuracyPercent = null;
        
        this._imgDrawX = 0;
        this._imgDrawY = 0;
        this._imgDrawW = 0;
        this._imgDrawH = 0;
        
        this.loadImageFile(imgPath);
        this.loadMaskFile(maskPath);
    }
    
    loadImageFile(filename) {
        this.loadedImage = loadImage(filename,
            () => { console.log('Image loaded:', filename); },
            () => { console.log('Failed to load image:', filename); }
        );
    }
    
    loadMaskFile(filename) {
        this.loadedMask = loadImage(filename,
            () => { console.log('Mask loaded:', filename); },
            () => { console.log('Failed to load mask:', filename); }
        );
    }
    
    draw() {
        this.drawImage();
        this.drawPolygon();
        this.drawPoints();
        this.updateTimeLeft();
        this.drawTimer();
        this.drawCursor();
        
        // state after timer ends
        if (!this.allowInteraction && this.accuracyPercent !== null) {
            this.drawAccuracy();
        }
    }
    
    drawImage() {
        if (!this.loadedImage) return;
        
        push();
        imageMode(CENTER);
        const scale = min(windowWidth / this.loadedImage.width, windowHeight / this.loadedImage.height) * 0.8;
        const drawW = this.loadedImage.width * scale;
        const drawH = this.loadedImage.height * scale;
        image(this.loadedImage, windowWidth / 2, windowHeight / 2, drawW, drawH);
        this._imgDrawW = drawW;
        this._imgDrawH = drawH;
        this._imgDrawX = windowWidth / 2 - drawW / 2;
        this._imgDrawY = windowHeight / 2 - drawH / 2;
        pop();
    }
    
    drawCursor() {
        push();
        stroke(0, 200, 20);
        strokeWeight(2);
        circle(mouseX, mouseY, 8);
        pop();
    }
    
    addPoint(x, y) {
        this.points.push({ x: x, y: y });
        this.updatePolygon();
    }
    
    updatePolygon() {
        this.edges = [];
        for (let i = 0; i < this.points.length - 1; i++) {
            this.edges.push([i, i + 1]);
        }
        if (this.points.length >= 3) {
            this.edges.push([this.points.length - 1, 0]);
        }
    }
    
    drawPolygon() {
        if (this.points.length === 0) return;
        
        const fillColor = color(0, 200, 20, 60);
        const outlineColor = color(0, 200, 20, 80);
        
        noStroke();
        fill(fillColor);
        beginShape();
        for (let i = 0; i < this.points.length; i++) vertex(this.points[i].x, this.points[i].y);
        if (this.points.length >= 3) endShape(CLOSE); else endShape();
        
        noFill();
        stroke(outlineColor);
        strokeWeight(3);
        beginShape();
        for (let i = 0; i < this.points.length; i++) vertex(this.points[i].x, this.points[i].y);
        if (this.points.length >= 3) endShape(CLOSE); else endShape();
    }
    
    drawPoints() {
        const pointSize = 8;
        noStroke();
        fill(0, 200, 20);
        for (let i = 0; i < this.points.length; i++) {
            const pt = this.points[i];
            circle(pt.x, pt.y, pointSize);
        }
    }
    
    startTimer() {
        this.timerStartMillis = millis();
        this.timerRunning = true;
        this.timeLeft = this.timeMs;
        this.accuracyPercent = null;
    }
    
    updateTimeLeft() {
        if (!this.timerRunning) return;
        const elapsed = millis() - this.timerStartMillis;
        this.timeLeft = max(0, this.timeMs - elapsed);
        
        if (this.timeLeft <= 0) {
            this.timerRunning = false;
            this.timeLeft = 0;
            this.onTimerEnd();
        }
    }
    
    drawTimer() {
        const display = (this.timeLeft / 1000).toFixed(2) + 's';
        // use centralized text drawing so styling is consistent
        drawText(display, 100, 70, { size: GLOBAL_TEXT_SIZE, alignH: LEFT, alignV: TOP, col: color(255) });
    }
    
    onTimerEnd() {
        this.allowInteraction = false;
        this.accuracyPercent = this.computePolygonMaskAccuracy();
        
        // trigger controller to move to next instance
        setTimeout(() => {
            onInstanceComplete(this.accuracyPercent);
        }, 100);
    }
    
    computePolygonMaskAccuracy() {
        if (!this.loadedMask) return 0;
        if (this.points.length === 0) return 0;
        
        const maskW = this.loadedMask.width;
        const maskH = this.loadedMask.height;
        const pg = createGraphics(maskW, maskH);
        pg.pixelDensity(1);
        pg.background(0);
        pg.noStroke();
        pg.fill(255);
        
        pg.beginShape();
        for (let i = 0; i < this.points.length; i++) {
            const cx = this.points[i].x;
            const cy = this.points[i].y;
            const mx = (this._imgDrawW > 0) ? map(cx, this._imgDrawX, this._imgDrawX + this._imgDrawW, 0, maskW) : cx;
            const my = (this._imgDrawH > 0) ? map(cy, this._imgDrawY, this._imgDrawY + this._imgDrawH, 0, maskH) : cy;
            pg.vertex(mx, my);
        }
        if (this.points.length >= 3) pg.endShape(CLOSE); else pg.endShape();
        
        pg.loadPixels();
        this.loadedMask.loadPixels();
        const pgPixels = pg.pixels;
        const maskPixels = this.loadedMask.pixels;
        const totalPixels = maskW * maskH;
        
        let maskWhiteCount = 0;
        let polyWhiteCount = 0;
        let overlapCount = 0;
        
        for (let i = 0; i < totalPixels; i++) {
            const idx = i * 4;
            const maskRed = maskPixels[idx], maskGreen = maskPixels[idx + 1], maskBlue = maskPixels[idx + 2];
            const maskBright = (maskRed + maskGreen + maskBlue) / 3;
            const maskIsWhite = maskBright > 127;
            
            const polyRed = pgPixels[idx], polyGreen = pgPixels[idx + 1], polyBlue = pgPixels[idx + 2];
            const polyBright = (polyRed + polyGreen + polyBlue) / 3;
            const polyIsWhite = polyBright > 127;
            
            if (maskIsWhite) maskWhiteCount++;
            if (polyIsWhite) polyWhiteCount++;
            if (maskIsWhite && polyIsWhite) overlapCount++;
        }
        
        if (maskWhiteCount === 0) {
            return (polyWhiteCount === 0) ? 100 : 0;
        }
        
        const maskBlackCount = totalPixels - maskWhiteCount;
        const falsePositive = polyWhiteCount - overlapCount;
        // Score: reward overlap with mask-white, penalize covering mask-black.
        // -> relation between correctly covered overlap and false positives
        let rawScore = (overlapCount / maskWhiteCount) - (falsePositive / maskBlackCount);
        const accuracy = constrain(max(rawScore, 0) * 100, 0, 100);
        return accuracy;
    }
    
    drawAccuracy() {
        const txt = (this.accuracyPercent !== null) ? this.accuracyPercent.toFixed(2) + '%' : '0.00%';
        push();
        textAlign(CENTER, CENTER);
        textSize(72);
        fill(255);
        noStroke();
        text(txt, windowWidth / 2, windowHeight / 2);
        pop();
    }
    
    mouseClicked() {
        if (!this.allowInteraction) return;
        this.addPoint(mouseX, mouseY);
        if (!this.timerRunning) {
            this.startTimer();
        }
    }
}