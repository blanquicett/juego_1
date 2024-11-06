/* Clase que representa un piso de la mina */
class Floor {
    constructor(level) {
        // Propiedades básicas del piso
        this.level = level;
        this.floorLevel = 1;
        this.isLocked = level > 1;
        
        // Niveles de mejora de trabajadores
        this.minerLevel = 1;
        this.transportLevel = 1;
        this.elevatorLevel = 1;
        this.powerLevel = 1;
        this.powerMultiplier = 1;
        
        // Costos y ganancias
        this.unlockCost = 150 * Math.pow(2, level - 1);
        this.baseIncome = 1000 * Math.pow(3, level - 1);
        
        // Estados de trabajo
        this.progress = 0;
        this.isWorking = false;
        this.minerWorked = false;
        this.elevatorWorked = false;
        this.collectorWorked = false;
        
        // Estados de recursos
        this.hasResource = false;
        this.resourceInElevator = false;
        this.resourceAtTop = false;
    }

    // Reinicia todos los estados de trabajo
    resetWorkState() {
        this.minerWorked = false;
        this.elevatorWorked = false;
        this.collectorWorked = false;
        this.hasResource = false;
        this.resourceInElevator = false;
        this.resourceAtTop = false;
    }
}

/* Sistema de partículas para efectos visuales */
function createMiningParticles(x, y, type = 'gold') {
    const particles = document.createElement('div');
    particles.className = 'mining-particles';
    particles.style.left = `${x}px`;
    particles.style.top = `${y}px`;

    // Crear múltiples partículas con dirección aleatoria
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = `particle ${type}`;
        
        const angle = (Math.random() * Math.PI) - (Math.PI / 2);
        const distance = 20 + Math.random() * 30;
        const particleX = Math.cos(angle) * distance;
        const particleY = Math.sin(angle) * distance;
        
        particle.style.setProperty('--x', particleX);
        particle.style.setProperty('--y', particleY);
        
        particles.appendChild(particle);
    }

    return particles;
}

/* Clase principal del juego */
class Game {
    constructor() {
        // Inicialización del juego
        this.money = 0;
        this.maxFloors = 10;
        this.floors = [
            new Floor(1),
            new Floor(2)
        ];
        
        // Sistema de audio
        this.backgroundMusic = document.getElementById('background-music');
        this.isMusicPlaying = false;
        this.setupMusic();
        this.showLoadingScreen();
    }

    // Configuración del sistema de música
    setupMusic() {
        const musicBtn = document.getElementById('toggle-music');
        musicBtn.addEventListener('click', () => {
            if (this.isMusicPlaying) {
                this.backgroundMusic.pause();
                musicBtn.textContent = '🔈';
            } else {
                this.backgroundMusic.play();
                musicBtn.textContent = '🔊';
            }
            this.isMusicPlaying = !this.isMusicPlaying;
        });
    }

    // Pantalla de carga inicial
    async showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const progress = document.querySelector('.loading-progress');
        const percentage = document.getElementById('loading-percentage');

        for (let i = 0; i <= 100; i++) {
            progress.style.width = `${i}%`;
            percentage.textContent = `${i}%`;
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        loadingScreen.style.transition = 'opacity 0.5s';
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            this.init();
        }, 500);
    }

    // Inicialización y funciones de economía
    init() {
        this.renderGame();
        this.backgroundMusic.play();
        this.isMusicPlaying = true;
    }

    addMoney(amount) {
        this.money += amount;
        this.updateStats();
    }

    getUpgradeCost(floor, type) {
        const baseMultiplier = Math.pow(3, floor.level - 1) * 75;
        const levelMultiplier = Math.pow(1.9, floor[type] - 1);
        return baseMultiplier * levelMultiplier;
    }

    upgradePower(index) {
        const floor = this.floors[index];
        const cost = 50 * floor.powerLevel;
        
        if (this.money >= cost && floor.powerLevel < 5) {
            this.money -= cost;
            floor.powerLevel++;
            floor.powerMultiplier = 1 + (floor.powerLevel * 0.5);
            floor.floorLevel++;
            this.updateStats();
            this.renderGame();
            this.checkAutoUnlock();
        }
    }

    // Sistema de mejoras
    upgrade(floorIndex, type) {
        const floor = this.floors[floorIndex];
        const cost = this.getUpgradeCost(floor, type);

        if (this.money >= cost && floor[type] < 5) {
            this.money -= cost;
            floor[type]++;
            this.updateStats();
            this.renderGame();
            this.checkAutoUnlock();
        }
    }

    // Funciones de trabajo de los personajes
    async minerWork(floorIndex) {
        const floor = this.floors[floorIndex];
        if (!floor.isLocked && !floor.isWorking && !floor.minerWorked) {
            floor.isWorking = true;
            const miner = document.querySelector(`#floor-${floorIndex} .miner`);
            const miningArea = document.querySelector(`#floor-${floorIndex} .mining-area`);
            
            miner.classList.add('working');
            
            // Sistema de partículas durante el minado
            const particleInterval = setInterval(() => {
                const rect = miner.getBoundingClientRect();
                const particles = createMiningParticles(
                    rect.right - miningArea.getBoundingClientRect().left,
                    rect.top - miningArea.getBoundingClientRect().top,
                    Math.random() > 0.5 ? 'gold' : 'diamond'
                );
                miningArea.appendChild(particles);
                setTimeout(() => particles.remove(), 1000);
            }, 300);
    
            const minerSpeed = 2000 - (floor.minerLevel * 400);
            await this.animate(floorIndex, 'miner', minerSpeed);
            
            clearInterval(particleInterval);
            miner.classList.remove('working');
            
            floor.minerWorked = true;
            floor.hasResource = true;
            floor.isWorking = false;
            this.updateFloorStatus(floorIndex);
            this.updateButtons(floorIndex);
        }
    }

    async elevatorWork(floorIndex) {
        const floor = this.floors[floorIndex];
        if (!floor.isLocked && !floor.isWorking && floor.minerWorked && !floor.elevatorWorked) {
            floor.isWorking = true;
            const elevator = document.querySelector(`#floor-${floorIndex} .elevator-operator`);
            elevator.classList.add('working');
            
            const elevatorSpeed = 1500 - (floor.elevatorLevel * 250);
            await this.animate(floorIndex, 'elevator', elevatorSpeed);
            
            elevator.classList.remove('working');
            floor.elevatorWorked = true;
            floor.hasResource = false;
            floor.resourceInElevator = true;
            floor.isWorking = false;
            this.updateFloorStatus(floorIndex);
            this.updateButtons(floorIndex);
        }
    }

    async collectorWork(floorIndex) {
        const floor = this.floors[floorIndex];
        if (!floor.isLocked && !floor.isWorking && floor.elevatorWorked && !floor.collectorWorked) {
            floor.isWorking = true;
            const collector = document.querySelector(`#floor-${floorIndex} .collector`);
            collector.classList.add('working');
            
            const collectorSpeed = 1000 - (floor.transportLevel * 150);
            await this.animate(floorIndex, 'collector', collectorSpeed);
            
            collector.classList.remove('working');
            floor.collectorWorked = true;
            floor.resourceInElevator = false;
            floor.resourceAtTop = true;

            const income = this.calculateIncome(floor);
            this.addMoney(income);

            floor.resetWorkState();
            floor.isWorking = false;
            this.updateFloorStatus(floorIndex);
            this.updateButtons(floorIndex);
        }
    }

    // Sistema de animación
    async animate(floorIndex, character, duration) {
        return new Promise(resolve => {
            setTimeout(resolve, duration);
        });
    }

    // Actualización de interfaz
    updateButtons(floorIndex) {
        const floor = this.floors[floorIndex];
        const minerBtn = document.querySelector(`#floor-${floorIndex} .miner-button`);
        const elevatorBtn = document.querySelector(`#floor-${floorIndex} .elevator-button`);
        const collectorBtn = document.querySelector(`#floor-${floorIndex} .collector-button`);

        if (minerBtn) minerBtn.disabled = floor.minerWorked || floor.isWorking;
        if (elevatorBtn) elevatorBtn.disabled = !floor.minerWorked || floor.elevatorWorked || floor.isWorking;
        if (collectorBtn) collectorBtn.disabled = !floor.elevatorWorked || floor.collectorWorked || floor.isWorking;
    }

    updateFloorStatus(floorIndex) {
        const floor = this.floors[floorIndex];
        const statusElement = document.querySelector(`#floor-${floorIndex} .work-status`);
        if (statusElement) {
            let status = "Esperando al minero";
            if (floor.minerWorked && !floor.elevatorWorked) {
                status = "Recurso listo para el elevador";
            } else if (floor.elevatorWorked && !floor.collectorWorked) {
                status = "Recurso listo para recolectar";
            }
            statusElement.textContent = status;
        }
    }

    // Sistema de potenciadores y desbloqueo
    

    calculateIncome(floor) {
        let income = floor.baseIncome;
        income *= (1 + (floor.minerLevel - 1) * 0.3); // 30% más por nivel
        income *= (1 + (floor.powerLevel - 1) * 0.2); // 20% adicional por nivel de poder
        return Math.floor(income);
    }

    updateStats() {
        document.getElementById('money').textContent = Math.floor(this.money);
    }

    checkAutoUnlock() {
        this.desbloquearSiguientePiso();
    }

    // Sistema de desbloqueo de pisos
    desbloquearSiguientePiso() {
        const pisoADesbloquear = this.floors.findIndex(floor => floor.isLocked);
        
        if (pisoADesbloquear === -1) return;
        
        const floor = this.floors[pisoADesbloquear];
        const previousFloor = this.floors[pisoADesbloquear - 1];
        
        const canUnlock = !previousFloor || (
            previousFloor.minerLevel >= 5 &&
            previousFloor.transportLevel >= 5 &&
            previousFloor.elevatorLevel >= 5 &&
            previousFloor.powerLevel >= 5 &&
            this.money >= floor.unlockCost
        );

        if (canUnlock) {
            this.money -= floor.unlockCost;
            floor.isLocked = false;
            
            if (pisoADesbloquear === this.floors.length - 1 && this.floors.length < this.maxFloors) {
                const newLevel = this.floors.length + 1;
                const newFloor = new Floor(newLevel);
                newFloor.isLocked = true;
                this.floors.push(newFloor);
            }
            
            this.updateStats();
            this.renderGame();
        }
    }

    // Sistema de renderizado
    renderFloor(floor, index) {
        const floorDiv = document.createElement('div');
        floorDiv.id = `floor-${index}`;
        floorDiv.className = `floor ${floor.isLocked ? 'locked' : ''}`;
    
        // Clonar el template base
        const template = document.getElementById('floor-template');
        const floorContent = template.content.cloneNode(true);
    
        // Actualizar el título
        const title = floorContent.querySelector('h3');
        title.textContent = `Piso ${index + 1} ${floor.isLocked ? '(Bloqueado)' : `(Nivel ${floor.floorLevel})`}`;
    
        // Contenedor de mejoras
        const upgradesContainer = floorContent.querySelector('.upgrades-container');
    
        if (!floor.isLocked) {
            // Clonar y rellenar el template de mejoras
            const upgradesTemplate = document.getElementById('upgrades-template');
            const upgradesContent = upgradesTemplate.content.cloneNode(true);
    
            // Rellenar datos de mejoras
            this.fillUpgradeData(upgradesContent, floor);
            upgradesContainer.appendChild(upgradesContent);
        } else {
            // Clonar y rellenar el template de desbloqueo
            const unlockTemplate = document.getElementById('unlock-template');
            const unlockContent = unlockTemplate.content.cloneNode(true);
    
            // Rellenar datos de desbloqueo
            this.fillUnlockData(unlockContent, floor, index);
            upgradesContainer.appendChild(unlockContent);
        }
    
        floorDiv.appendChild(floorContent);
    
        // Agregar event listeners si el piso está desbloqueado
        if (!floor.isLocked) {
            this.addFloorEventListeners(floorDiv, index);
        }
    
        return floorDiv;
    }
    
    // Nuevas funciones auxiliares
    fillUpgradeData(content, floor) {
        const minerUpgrade = content.querySelector('.miner-upgrade');
        minerUpgrade.innerHTML = `
            Mejorar Minero (Nivel ${floor.minerLevel}) - $${this.getUpgradeCost(floor, 'minerLevel')}
            <br>Velocidad: ${(3000 - (floor.minerLevel * 500))/1000}s | Bonus: +${(floor.minerLevel - 1) * 50}% dinero
        `;
    
        const transportUpgrade = content.querySelector('.transport-upgrade');
        transportUpgrade.innerHTML = `
            Mejorar Transporte (Nivel ${floor.transportLevel}) - $${this.getUpgradeCost(floor, 'transportLevel')}
            <br>Velocidad: ${(2000 - (floor.transportLevel * 300))/1000}s
        `;
    
        const elevatorUpgrade = content.querySelector('.elevator-upgrade');
        elevatorUpgrade.innerHTML = `
            Mejorar Elevador (Nivel ${floor.elevatorLevel}) - $${this.getUpgradeCost(floor, 'elevatorLevel')}
            <br>Velocidad: ${(2500 - (floor.elevatorLevel * 400))/1000}s
        `;
    
        const powerBtn = content.querySelector('.power-btn');
        powerBtn.innerHTML = `
            Potenciador (Nivel ${floor.powerLevel}) - $${50 * floor.powerLevel}
            <br>Necesario para desbloquear siguiente piso
        `;
        if (floor.powerLevel >= 5) powerBtn.disabled = true;
    }
    
    fillUnlockData(content, floor, index) {
        const canUnlock = !this.floors[index - 1] || (
            this.floors[index - 1].minerLevel >= 5 &&
            this.floors[index - 1].transportLevel >= 5 &&
            this.floors[index - 1].elevatorLevel >= 5 &&
            this.floors[index - 1].powerLevel >= 5
        );
    
        const unlockMessage = !canUnlock && index > 0 ? 
            'El piso anterior debe tener todas las mejoras al máximo' : 
            this.money >= floor.unlockCost ? 
                'Se desbloqueará automáticamente cuando se cumplan los requisitos' : 
                'Necesitas más dinero';
    
        const costText = content.querySelector('p:first-child');
        costText.textContent = `Costo de desbloqueo: $${floor.unlockCost}`;
    
        const messageText = content.querySelector('p:last-child');
        messageText.textContent = unlockMessage;
    }
    
    addFloorEventListeners(floorDiv, index) {
        const minerUpgrade = floorDiv.querySelector('.miner-upgrade');
        const transportUpgrade = floorDiv.querySelector('.transport-upgrade');
        const elevatorUpgrade = floorDiv.querySelector('.elevator-upgrade');
        const powerBtn = floorDiv.querySelector('.power-btn');
        const minerBtn = floorDiv.querySelector('.miner-button');
        const elevatorBtn = floorDiv.querySelector('.elevator-button');
        const collectorBtn = floorDiv.querySelector('.collector-button');
    
        minerUpgrade.addEventListener('click', () => this.upgrade(index, 'minerLevel'));
        transportUpgrade.addEventListener('click', () => this.upgrade(index, 'transportLevel'));
        elevatorUpgrade.addEventListener('click', () => this.upgrade(index, 'elevatorLevel'));
        powerBtn.addEventListener('click', () => this.upgradePower(index));
        minerBtn.addEventListener('click', () => this.minerWork(index));
        elevatorBtn.addEventListener('click', () => this.elevatorWork(index));
        collectorBtn.addEventListener('click', () => this.collectorWork(index));
    }

    renderGame() {
        const mineElement = document.getElementById('mine');
        mineElement.innerHTML = '';
        this.floors.forEach((floor, index) => {
            mineElement.appendChild(this.renderFloor(floor, index));
        });
        this.updateStats();
    }
}

// Inicialización del juego
const game = new Game();