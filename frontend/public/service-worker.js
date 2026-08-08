// Este código fica escutando o servidor em segundo plano
self.addEventListener('push', function(event) {
    const data = event.data ? event.data.json() : {};
    
    const titulo = data.title || 'Dominó do PAF1';
    const opcoes = {
        body: data.body || 'Notificação do jogo!',
        icon: '/favicon.ico', // Ícone que vai aparecer na notificação
        vibrate: [200, 100, 200] // Faz o celular vibrar! 📱📳
    };

    event.waitUntil(
        self.registration.showNotification(titulo, opcoes)
    );
});