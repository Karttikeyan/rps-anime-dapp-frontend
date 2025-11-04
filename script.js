const CONTRACT_ADDRESS = '0xc28E591dc1060066605b8842028a4Bfe70010101'; // Tu contrato RPSGame in Base
const CONTRACT_ABI = [
    "function createGame() external payable",
    "function joinGame(uint256 _gameId) external payable",
    "function makeChoice(uint256 _gameId, uint8 _choice) external",
    "function games(uint256) view returns (address player1, address player2, uint8 choice1, uint8 choice2, uint8 result, bool resolved, uint256 betAmount)",
    "function gameId() view returns (uint256)"
];

let provider, signer, contract;

async function init() {
    if (window.ethereum) {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        document.getElementById('connectBtn').onclick = connectWallet;
    } else {
        document.getElementById('status').innerText = 'Instala MetaMask para jugar';
    }
}

async function connectWallet() {
    try {
        await provider.send("eth_requestAccounts", []);
        signer = provider.getSigner();
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        const network = await provider.getNetwork();
        if (network.chainId !== 8453) {
            alert('Cambia a la red Base in MetaMask');
            return;
        }
        const address = await signer.getAddress();
        document.getElementById('status').innerText = `¡Conectado! Tu dirección: ${address.slice(0,6)}...${address.slice(-4)}`;
        document.getElementById('connectBtn').style.display = 'none';
        document.getElementById('gameSection').style.display = 'block';
        setupButtons();
    } catch (error) {
        console.error('Error conexión:', error);
        const reason = error.reason || error.message || (error.data ? ethers.utils.toUtf8String(error.data.slice(10)) : 'Error desconocido');
        alert(reason);
    }
}

function setupButtons() {
    document.getElementById('createBtn').onclick = createGame;
    document.getElementById('joinBtn').onclick = joinGame;
    document.getElementById('rockBtn').onclick = () => makeChoice(1); // Rock = 1
    document.getElementById('paperBtn').onclick = () => makeChoice(2); // Paper = 2
    document.getElementById('scissorsBtn').onclick = () => makeChoice(3); // Scissors = 3
}

async function createGame() {
    try {
        const tx = await contract.createGame({ value: ethers.utils.parseEther('0.00001') });
        document.getElementById('status').innerText = 'Creando juego... Espera (TX: ' + tx.hash + ')';
        await tx.wait();
        const newId = await contract.gameId();
        const gameId = newId - 1;
        document.getElementById('gameInfo').innerText = `¡Juego creado! ID: ${gameId}. Espera al jugador 2 y elige tu movimiento.`;
        document.getElementById('choiceSection').style.display = 'block';
        document.getElementById('joinInfo').style.display = 'none';
    } catch (error) {
        console.error('Error crear:', error);
        const reason = error.reason || error.message || (error.data ? ethers.utils.toUtf8String(error.data.slice(10)) : 'Error desconocido');
        document.getElementById('status').innerText = 'Error al crear: ' + reason;
    }
}

async function joinGame() {
    const gameIdInput = document.getElementById('gameIdInput').value;
    const gameId = parseInt(gameIdInput);
    if (isNaN(gameId) || gameId < 1) {
        alert('Ingresa un ID de juego válido (ej: 1)');
        return;
    }
    // Pre-check: Verifica si el juego existe (basado in depapp)
    try {
        const game = await contract.games(gameId);
        if (game.player1 === '0x0000000000000000000000000000000000000000') {
            alert('Juego no existe. Crea uno primero.');
            return;
        }
        if (game.choice1 === 0) {
            alert('El jugador 1 debe elegir primero.');
            return;
        }
    } catch (e) {
        alert('Juego no existe. Crea uno primero.');
        return;
    }
    try {
        const tx = await contract.joinGame(gameId, { value: ethers.utils.parseEther('0.00001') });
        document.getElementById('status').innerText = 'Uniendo al juego... Espera (TX: ' + tx.hash + ')';
        await tx.wait();
        document.getElementById('gameInfo').innerText = `¡Unido al juego ${gameId}! Elige tu movimiento.`;
        document.getElementById('choiceSection').style.display = 'block';
    } catch (error) {
        console.error('Error unir:', error);
        const reason = error.reason || error.message || (error.data ? ethers.utils.toUtf8String(error.data.slice(10)) : 'Error desconocido');
        document.getElementById('status').innerText = 'Error al unir: ' + reason;
    }
}

async function makeChoice(choice) {
    let gameId = parseInt(document.getElementById('gameIdInput').value);
    if (isNaN(gameId)) {
        const currentId = await contract.gameId();
        gameId = currentId - 1;
        if (gameId < 1) {
            alert('No hay juego activo. Crea uno primero.');
            return;
        }
    }
    try {
        const tx = await contract.makeChoice(gameId, choice);
        document.getElementById('status').innerText = 'Enviando elección... Espera (TX: ' + tx.hash + ')';
        await tx.wait();
        // Lee el juego para mostrar resultado
        const game = await contract.games(gameId);
        const choices = ['Ninguno', 'Piedra', 'Papel', 'Tijeras'];
        const results = ['Pendiente', 'Ganas', 'Pierdes', 'Empate'];
        let resultText = `Tu elección: ${choices[choice]}. Juego ID ${gameId}: P1: ${choices[game.choice1]}, P2: ${choices[game.choice2]}. `;
        if (game.resolved) {
            resultText += `¡Resultado: ${results[game.result]}!`;
        } else {
            resultText += 'Esperando elección del oponente...';
        }
        document.getElementById('result').innerText = resultText;
    } catch (error) {
        console.error('Error elegir:', error);
        const reason = error.reason || error.message || (error.data ? ethers.utils.toUtf8String(error.data.slice(10)) : 'Error desconocido');
        document.getElementById('status').innerText = 'Error al elegir: ' + reason;
    }
}

init(); // Inicia cuando carga la página
