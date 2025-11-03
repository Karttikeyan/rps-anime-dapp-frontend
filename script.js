const CONTRACT_ADDRESS = '0x4b02d011380a9c2b514a5a656ab240d67bd12bc0'; // Tu contrato RPSGame en Base
const CONTRACT_ABI = [ // ABI básico de las funciones clave (lo generé de tu .sol, sin extras)
    "function createGame() external payable",
    "function joinGame(uint256 _gameId) external payable",
    "function makeChoice(uint256 _gameId, uint8 _choice) external", // _choice: 1=Rock, 2=Paper, 3=Scissors
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
        if (network.chainId !== 8453) { // Verifica Base Mainnet
            alert('Cambia a la red Base en MetaMask');
            return;
        }
        const address = await signer.getAddress();
        document.getElementById('status').innerText = `¡Conectado! Tu dirección: ${address.slice(0,6)}...${address.slice(-4)}`;
        document.getElementById('connectBtn').style.display = 'none';
        document.getElementById('gameSection').style.display = 'block';
        setupButtons();
    } catch (error) {
        document.getElementById('status').innerText = 'Error al conectar: ' + error.message;
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
        const tx = await contract.createGame({ value: ethers.utils.parseEther('0.001') });
        document.getElementById('status').innerText = 'Creando juego... Espera (TX: ' + tx.hash + ')';
        await tx.wait();
        const newId = await contract.gameId();
        const gameId = newId - 1;
        document.getElementById('gameInfo').innerText = `¡Juego creado! ID: ${gameId}. Espera al jugador 2 y elige tu movimiento.`;
        document.getElementById('choiceSection').style.display = 'block';
        document.getElementById('joinInfo').style.display = 'none';
    } catch (error) {
        document.getElementById('status').innerText = 'Error al crear: ' + error.message;
    }
}

async function joinGame() {
    const gameId = parseInt(document.getElementById('gameIdInput').value);
    if (!gameId) {
        alert('Ingresa un ID de juego válido');
        return;
    }
    try {
        const tx = await contract.joinGame(gameId, { value: ethers.utils.parseEther('0.001') });
        document.getElementById('status').innerText = 'Uniendo al juego... Espera (TX: ' + tx.hash + ')';
        await tx.wait();
        document.getElementById('gameInfo').innerText = `¡Unido al juego ${gameId}! Elige tu movimiento.`;
        document.getElementById('choiceSection').style.display = 'block';
    } catch (error) {
        document.getElementById('status').innerText = 'Error al unir: ' + error.message;
    }
}

async function makeChoice(choice) {
    const gameId = parseInt(document.getElementById('gameIdInput').value) || (await contract.gameId() - 1);
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
        document.getElementById('status').innerText = 'Error al elegir: ' + error.message;
    }
}

init(); // Inicia cuando carga la página
