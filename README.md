# 🎲 Dominó do PAF1 - Sistema de Gestão de Filas e Partidas

> Aplicação web real-time desenvolvida para organizar e automatizar a fila de espera do dominó na comunidade universitária (PAF1 - UFBA).

![Demonstração do Projeto](https://img.shields.io/badge/Status-Em_Produ%C3%A7%C3%A3o-success)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=flat&logo=vite&logoColor=FFD62E)
![Supabase](https://img.shields.io/badge/Supabase-181818?style=flat&logo=supabase&logoColor=3ECF8E)

## 📌 O Problema
A comunidade de jogadores enfrentava dificuldades diárias com a organização da fila de espera física. Disputas por ordem de chegada, fura-filas, dificuldade em gerenciar duplas e a ausência de um histórico de partidas geravam conflitos e desorganização no salão.

## 💡 A Solução
O **Dominó do PAF1** substitui o controle manual por um painel digital sincronizado em tempo real. Os jogadores podem se registrar, entrar na fila (individualmente ou em duplas), escolher mesas de preferência e acompanhar as partidas em andamento diretamente de seus smartphones.

## 🚀 Principais Funcionalidades
- **Gestão de Fila Real-Time:** Atualização instantânea da fila de espera via polling/WebSockets.
- **Modos de Entrada:** Suporte para entrada Solo (cai com parceiro aleatório) ou Dupla Fechada (com validação de PIN de segurança).
- **Painel de Partidas ao Vivo:** Monitoramento de quais duplas estão jogando em quais mesas e o tempo de duração.
- **Sistema de Administração (Modo Deus):** Dashboard oculto para administradores com poderes de congelar jogadores, forçar alocações em mesas específicas e kickar usuários, garantindo a ordem.
- **Destaque da Semana:** Sessão dinâmica para engajamento da comunidade, mostrando o jogador em destaque e dicas táticas.

## 🔒 Privacidade e Segurança (LGPD)
Este repositório adota boas práticas de segurança e privacidade:
- **Sanitização de Dados:** Dados pessoais, nomes reais de usuários e fotos (Storage via Supabase) não são expostos no código-fonte.
- **Fallbacks Genéricos:** A interface renderiza Avatares seguros (via UI-Avatars) e dados fictícios no modo de demonstração.
- **Variáveis de Ambiente:** Toda a injeção de perfis reais e chaves de API (`VITE_SUPABASE_URL`, `VITE_ADMIN_USERS`) ocorre estritamente via `.env` no servidor de produção.

## 🛠️ Tecnologias Utilizadas
- **Frontend:** React.js, Vite, Axios
- **Backend/BaaS:** Supabase, Node.js (Render)
- **Design:** CSS-in-JS (Inline Styles padronizados) para renderização leve e direta.

## ⚙️ Como rodar localmente

1. Clone o repositório:
```bash
git clone [https://github.com/SEU-USUARIO/app-domino.git](https://github.com/SEU-USUARIO/app-domino.git)
