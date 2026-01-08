// 1. Importar o Express
const express = require('express');
const app = express();
const porta = 3000;

// 2. Criar a nossa "Fila" (por enquanto é apenas uma lista vazia na memória)
let filaDeEspera = [];

// 3. Rota Principal (O que aparece quando você abre o site)
app.get('/', (req, res) => {
    res.send('Bem-vindo ao Gerenciador de Dominó da UFBA!');
});

// 4. Rota da Fila (Onde vamos checar quem está esperando)
app.get('/fila', (req, res) => {
    if (filaDeEspera.length === 0) {
        res.send('A fila está vazia no momento. Bora jogar?');
    } else {
        res.json(filaDeEspera);
    }
});

// 5. Ligar o Servidor
app.listen(porta, () => {
    console.log(`Servidor rodando em http://localhost:${porta}`);
});