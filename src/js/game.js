import { MAP_URL, QUESTS_BASE_URL, NPCS_BASE_URL, DIALOGS_BASE_URL, ACTIVE_NPCS } from './config.js';

// ! - Global variables -
let map = [];
let activeQuest = null;
let npcs = [];
let player = { x: 1, y: 1, screenX: 32, screenY: 32, dx: 0, dy: 0, speed: 4, width: 28, height: 28 };
let lastInteractedNPC = null;
let canvas, ctx;
const tileSize = 32;
let offsetX = 0;
let offsetY = 0;
let mapWidth = 0;
let mapHeight = 0;
let currentDialog = null;
let isDialogActive = false; 
let isMobile = false;
let showControls = false; 
let upButton, downButton, leftButton, rightButton, interactButton;
let isMovingUp = false;
let isMovingDown = false;
let isMovingLeft = false;
let isMovingRight = false;

// ! - MOBILE -
function checkIfMobile() {
    if (window.innerWidth <= 1000) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    if (isMobile) {
        showControls = true;
        createMobileControls();
    } else {
        showControls = false;
        removeMobileControls();
    }
}

function createArrowButton(direction, x, y) {
    const button = document.createElement('button');
    const arrowIcon = document.createElement('img');
    arrowIcon.src = 'src/img/arrow.svg';

    switch (direction) {
        case 'up':
            arrowIcon.style.transform = 'rotate(-90deg)';
            break;
        case 'down':
            arrowIcon.style.transform = 'rotate(90deg)';
            break;
        case 'left':
            arrowIcon.style.transform = 'rotate(180deg)';
            break;
        case 'right':
            arrowIcon.style.transform = 'rotate(0deg)';
            break;
    }

    arrowIcon.style.width = '80px';
    arrowIcon.style.height = '80px';
    button.appendChild(arrowIcon);

    button.style.position = 'absolute';
    button.style.left = `${x}px`;
    button.style.top = `${y}px`;
    button.style.background = 'transparent';
    button.style.border = 'none';
    button.style.cursor = 'pointer';
    button.style.zIndex = '1000';

    return button;
}

function createInteractButton(x, y) {
    const button = document.createElement('button');
    const interactionIcon = document.createElement('img');
    interactionIcon.src = 'src/img/interaction.svg';
    interactionIcon.style.width = '90px';
    interactionIcon.style.height = '90px';

    button.appendChild(interactionIcon);

    button.style.position = 'absolute';
    button.style.left = `${x}px`;
    button.style.top = `${y}px`;
    button.style.background = 'transparent';
    button.style.border = 'none';
    button.style.cursor = 'pointer';
    button.style.zIndex = '1000';

    button.addEventListener('click', () => executeInteraction());

    return button;
}


function createMobileControls() {
    upButton = createArrowButton('up', 80, window.innerHeight - 220);
    downButton = createArrowButton('down', 80, window.innerHeight - 80);
    leftButton = createArrowButton('left', 10, window.innerHeight - 150);
    rightButton = createArrowButton('right', 150, window.innerHeight - 150);

    interactButton = createInteractButton(window.innerWidth - 120, window.innerHeight - 150);

    document.body.appendChild(upButton);
    document.body.appendChild(downButton);
    document.body.appendChild(leftButton);
    document.body.appendChild(rightButton);
    document.body.appendChild(interactButton);

    upButton.addEventListener('touchstart', () => handleTouchStart('up'));
    downButton.addEventListener('touchstart', () => handleTouchStart('down'));
    leftButton.addEventListener('touchstart', () => handleTouchStart('left'));
    rightButton.addEventListener('touchstart', () => handleTouchStart('right'));

    upButton.addEventListener('touchend', () => handleTouchEnd('up'));
    downButton.addEventListener('touchend', () => handleTouchEnd('down'));
    leftButton.addEventListener('touchend', () => handleTouchEnd('left'));
    rightButton.addEventListener('touchend', () => handleTouchEnd('right'));
}

function handleMovement(direction) {
    switch (direction) {
        case 'up':
            player.dy = isMovingUp ? -player.speed : 0;
            break;
        case 'down':
            player.dy = isMovingDown ? player.speed : 0;
            break;
        case 'left':
            player.dx = isMovingLeft ? -player.speed : 0;
            break;
        case 'right':
            player.dx = isMovingRight ? player.speed : 0;
            break;
    }
}

function handleTouchStart(direction) {
    switch (direction) {
        case 'up':
            isMovingUp = true;
            break;
        case 'down':
            isMovingDown = true;
            break;
        case 'left':
            isMovingLeft = true;
            break;
        case 'right':
            isMovingRight = true;
            break;
    }
    handleMovement(direction);
}

function handleTouchEnd(direction) {
    switch (direction) {
        case 'up':
            isMovingUp = false;
            break;
        case 'down':
            isMovingDown = false;
            break;
        case 'left':
            isMovingLeft = false;
            break;
        case 'right':
            isMovingRight = false;
            break;
    }
    handleMovement(direction);
}

function executeInteraction() {
    if (currentDialog) return;

    for (const npc of npcs) {
        const distanceX = Math.abs(player.x - npc.position.x);
        const distanceY = Math.abs(player.y - npc.position.y);

        if (distanceX <= 1 && distanceY <= 1) {
            executeNPCInteraction(npc);
            break;
        }
    }
}

function removeMobileControls() {
    if (upButton) upButton.remove();
    if (downButton) downButton.remove();
    if (leftButton) leftButton.remove();
    if (rightButton) rightButton.remove();
    if (interactButton) interactButton.remove();
}

//! - GAME -
async function init() {
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    document.body.appendChild(canvas);
    resizeCanvas();

    await loadMap();
    await loadNPCs();
    // await loadQuest(0);

    centerCameraOnPlayer();

    setupEventListeners();
    gameLoop();
}

// Resize canvas to fill the screen
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

function centerCameraOnPlayer() {
    offsetX = player.screenX - canvas.width / 2 + player.width / 2;
    offsetY = player.screenY - canvas.height / 2 + player.height / 2;
}

function lerp(start, end, t) {
    return start + (end - start) * t;
}

async function loadMap() {
    try {
        const response = await fetch(MAP_URL);
        map = await response.json();

        mapWidth = map.tiles[0].length * tileSize;
        mapHeight = map.tiles.length * tileSize;
    } catch (err) {
        console.error('Error loading map:', err);
    }
}

async function loadNPCs() {
    npcs = [];
    for (const id of ACTIVE_NPCS) {
        try {
            const response = await fetch(`${NPCS_BASE_URL}${id}.json`);
            const npc = await response.json();
            npcs.push(npc);
        } catch (err) {
            console.error(`Error loading NPC ${id}:`, err);
        }
    }
    console.log('Loaded NPCs:', npcs);
}

async function loadQuest(id) {
    try {
        const response = await fetch(`${QUESTS_BASE_URL}${id}.json`);
        activeQuest = await response.json();
        displayActiveQuest();
        console.log('Loaded quest:', activeQuest);
    } catch (err) {
        console.error(`Error loading quest ${id}:`, err);
    }
}

async function loadDialog(id) {
    try {
        const response = await fetch(`${DIALOGS_BASE_URL}${id}.json`);
        const dialog = await response.json();
        handleDialog(dialog);
    } catch (err) {
        console.error(`Error loading dialog ${id}:`, err);
    }
}

function handleDialog(dialog) {
    if (currentDialog) {
        document.body.removeChild(currentDialog);
    }

    isDialogActive = true;

    const dialogContainer = document.createElement('div');
    dialogContainer.style.position = 'absolute';
    dialogContainer.style.top = '10px';
    dialogContainer.style.left = '50%';
    dialogContainer.style.transform = 'translateX(-50%)';
    dialogContainer.style.width = '80%';
    dialogContainer.style.padding = '10px';
    dialogContainer.style.backgroundColor = '#999';
    dialogContainer.style.border = '2px solid #000';
    dialogContainer.style.borderRadius = '10px';
    dialogContainer.style.zIndex = '1000';

    const npcName = lastInteractedNPC ? lastInteractedNPC.name : "NPC";

    const npcNameElement = document.createElement('h3');
    npcNameElement.textContent = npcName;
    dialogContainer.appendChild(npcNameElement);

    const dialogText = document.createElement('p');
    dialogContainer.appendChild(dialogText);

    const responseContainer = document.createElement('div');
    responseContainer.style.marginTop = '10px';

    dialog.responses.forEach((response) => {
        const responseButton = document.createElement('button');
        responseButton.textContent = response.text;
        responseButton.style.marginRight = '10px';
        responseButton.style.display = "none";

        responseButton.addEventListener('click', () => {
            handleResponseEffect(response.effect);

            document.body.removeChild(dialogContainer);
            currentDialog = null;
            isDialogActive = false;
        });

        responseContainer.appendChild(responseButton);
    });

    dialogContainer.appendChild(responseContainer);
    document.body.appendChild(dialogContainer);

    let i = 0;
    function typeWriter() {
        if (i < dialog.text.length) {
            dialogText.textContent += dialog.text.charAt(i);
            i++;
            setTimeout(typeWriter, 50);
        } else {
            responseContainer.querySelectorAll('button').forEach(button => {
                setTimeout(() => {
                    button.style.display = "inline-block";
                }, 500);
            });
        }
    }

    typeWriter();

    currentDialog = dialogContainer;
}

function handleResponseEffect(effect) {
    if (effect.execute === 'quest') {
        loadQuest(effect.id);
    } else if (effect.execute === 'dialog') {
        loadDialog(effect.id);
    }
}

function displayActiveQuest() {
    const questContainer = document.getElementById('active-quest');

    if (!questContainer) {
        //lastInteractedNPC?.color
        const newContainer = document.createElement('div');
        newContainer.id = 'active-quest';
        newContainer.style.position = 'absolute';
        newContainer.style.top = '10px';
        newContainer.style.left = '10px';
        newContainer.style.padding = '10px';
        newContainer.style.backgroundColor = '#ccc';
        newContainer.style.border = '2px solid #000';
        newContainer.style.borderRadius = '10px';
        newContainer.style.color = '#000';
        newContainer.style.zIndex = '1000';
        document.body.appendChild(newContainer);
    }

    const questDisplay = document.getElementById('active-quest');
    questDisplay.innerHTML = `<strong>${activeQuest.title}</strong><br>${activeQuest.description}`;
}

function drawMap() {
    for (let y = 0; y < map.tiles.length; y++) {
        for (let x = 0; x < map.tiles[y].length; x++) {
            const tile = map.tiles[y][x];
            switch (tile) {
                case 'grass':
                    ctx.fillStyle = 'green';
                    break;
                case 'water':
                    ctx.fillStyle = 'blue';
                    break;
                case 'wall':
                    ctx.fillStyle = 'gray';
                    break;
                default:
                    ctx.fillStyle = 'black';
            }
            const screenX = Math.floor(x * tileSize - offsetX);
            const screenY = Math.floor(y * tileSize - offsetY);
            ctx.fillRect(screenX, screenY, tileSize, tileSize);
        }
    }
}

function drawNPCs() {
    for (const npc of npcs) {
        const screenX = npc.position.x * tileSize - offsetX;
        const screenY = npc.position.y * tileSize - offsetY;
        ctx.fillStyle = npc.color;
        ctx.fillRect(screenX, screenY, tileSize, tileSize);
    }
}

function drawPlayer() {
    const screenX = player.screenX - offsetX;
    const screenY = player.screenY - offsetY;
    ctx.fillStyle = 'red';
    ctx.fillRect(screenX, screenY, player.width, player.height);
}

function checkCollision(nextX, nextY) {
    const playerLeft = nextX;
    const playerRight = nextX + player.width;
    const playerTop = nextY;
    const playerBottom = nextY + player.height;

    for (let y = 0; y < map.tiles.length; y++) {
        for (let x = 0; x < map.tiles[y].length; x++) {
            const tile = map.tiles[y][x];
            if (tile === 'wall') {
                const tileLeft = x * tileSize;
                const tileRight = tileLeft + tileSize;
                const tileTop = y * tileSize;
                const tileBottom = tileTop + tileSize;

                if (
                    playerRight > tileLeft &&
                    playerLeft < tileRight &&
                    playerBottom > tileTop &&
                    playerTop < tileBottom
                ) {
                    return false;
                }
            }
        }
    }
    return true;
}

function handlePlayerMovement() {
    if (isDialogActive) return;

    if (player.dx !== 0 || player.dy !== 0) {
        const nextX = player.screenX + player.dx;
        const nextY = player.screenY + player.dy;

        if (checkCollision(nextX, nextY)) {
            player.screenX = nextX;
            player.screenY = nextY;
            player.x = Math.floor(player.screenX / tileSize);
            player.y = Math.floor(player.screenY / tileSize);
        } else {
            player.dx = 0;
            player.dy = 0;
        }

        checkQuestCompletion();
    }

    const targetOffsetX = player.screenX - canvas.width / 2 + player.width / 2;
    const targetOffsetY = player.screenY - canvas.height / 2 + player.height / 2;

    const maxOffsetX = mapWidth - canvas.width;
    const maxOffsetY = mapHeight - canvas.height;

    let larpValue = 0.05;
    offsetX = lerp(offsetX, targetOffsetX, larpValue);
    offsetY = lerp(offsetY, targetOffsetY, larpValue);

    offsetX = Math.max(0, Math.min(offsetX, maxOffsetX));
    offsetY = Math.max(0, Math.min(offsetY, maxOffsetY));

    checkNPCProximity();
}

function checkNPCProximity() {
    for (const npc of npcs) {
        const distanceX = Math.abs(player.x - npc.position.x);
        const distanceY = Math.abs(player.y - npc.position.y);

        if (distanceX <= 1 && distanceY <= 1) {
            window.addEventListener('keydown', (e) => {
                if (e.key === 'E' || e.key === 'e') {
                    executeNPCInteraction(npc);
                }
            }, { once: true });
        }
    }
}

function executeNPCInteraction(npc) {
    if (currentDialog) return;

    lastInteractedNPC = npc;

    const effect = npc.effect;
    
    if (effect.execute === 'dialog') {
        loadDialog(effect.id);
    }
}

function checkQuestCompletion() {
    if (!activeQuest) return;
    const currentStep = activeQuest.steps?.find(step => step.task);
    if (currentStep && player.x === currentStep.targetLocation[0] && player.y === currentStep.targetLocation[1]) {
        console.log('Task completed:', currentStep.task);
        if (currentStep.onCompletion) {
            handleCompletion(currentStep.onCompletion);
        }
    }
}

function handleCompletion(completion) {
    if (completion.updateMap) {
        for (const update of completion.updateMap) {
            map.tiles[update.y][update.x] = update.value;
        }
    }
    if (completion.dialogue) {
        alert(completion.dialogue);
    }
    const nextStep = activeQuest.steps.find(step => step.id === (completion.nextStep || null));
    if (!nextStep) {
        console.log('Quest completed!');
        loadNextQuest();
    }
}

function loadNextQuest() {
    if (activeQuest && activeQuest.nextQuestId) {
        loadQuest(activeQuest.nextQuestId);
    } else {
        console.log('No more quests available.');
    }
}

function setupEventListeners() {
    window.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'ArrowUp':
                player.dy = -player.speed;
                break;
            case 'ArrowDown':
                player.dy = player.speed;
                break;
            case 'ArrowLeft':
                player.dx = -player.speed;
                break;
            case 'ArrowRight':
                player.dx = player.speed;
                break;
        }
    });

    window.addEventListener('keyup', (e) => {
        switch (e.key) {
            case 'ArrowUp':
            case 'ArrowDown':
                player.dy = 0;
                break;
            case 'ArrowLeft':
            case 'ArrowRight':
                player.dx = 0;
                break;
        }
    });
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMap();
    drawNPCs();
    handlePlayerMovement();
    drawPlayer();
    requestAnimationFrame(gameLoop);
}

init();
