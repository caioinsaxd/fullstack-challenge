# Crash Game - Plataforma de Jogos em Tempo Real

Projeto completo de crash game desenvolvido como desafio técnico full-stack.

## 🚀 Tecnologias

- **Backend**: NestJS, TypeScript, Prisma, PostgreSQL, RabbitMQ
- **Frontend**: React, Vite, Tailwind CSS, Zustand
- **Infraestrutura**: Docker, Docker Compose, Kong, Keycloak

## 📋 Pré-requisitos

- Bun (v1.0+)
- Docker e Docker Compose

## 🚀 Como Executar

```bash
# Instalar dependências
bun install

# Copiar variáveis de ambiente
cp services/games/.env.example services/games/.env
cp services/wallets/.env.example services/wallets/.env
cp frontend/.env.example frontend/.env

# Iniciar todos os serviços
bun run docker:up
```

## 🌐 Acesso Após Inicialização

- **Frontend**: http://localhost:3000
- **Documentação API (Games Service)**: http://localhost:8000/games/api/docs (Swagger UI)
- **Documentação API (Wallets Service)**: http://localhost:8000/wallets/api/docs (Swagger UI)
- **Admin Keycloak**: http://localhost:8080 (usuário: admin, senha: admin)
- **Usuário de teste**: player / player123 (pré-configurado com saldo na carteira)

## 🧪 Testes

```bash
# Testes unitários do backend
cd services/games && bun test tests/unit
cd services/wallets && bun test tests/unit

# Testes E2E do backend (requer docker:up em execução)
cd services/games && bun test tests/e2e

# Testes do frontend (executar quando houver testes implementados)
# cd frontend && bun test
```

## 🛑 Parar e Limpar

```bash
# Parar todos os serviços
bun run docker:down

# Limpar completamente (containers, volumes, imagens)
bun run docker:prune
```

## ✨ Funcionalidades Implementadas

- ✅ Jogo em tempo real com multiplicador crescente e atualizações via WebSocket
- ✅ Sistema completo de apostas (valor mínimo/máximo, validação de saldo)
- ✅ Sistema de cashout com cálculo de lucro em tempo real
- ✅ Carteira digital com operações de crédito e débito
- ✅ Algoritmo provably fair para transparência e verificação de resultados
- ✅ Autenticação segura via Keycloak (OAuth2/OIDC com JWT)
- ✅ Comunicação assíncrona entre serviços via RabbitMQ
- ✅ Interface responsiva com tema escuro otimizada para cassino
- ✅ Documentação API completa com Swagger/OpenAPI para todos os endpoints
- ✅ Testes unitários cobrindo domínio, aplicacao e infraestrutura
- ✅ Testes E2E validando fluxos completos de jogo
- ✅ Arquitetura baseada em DDD com bounded contexts bem definidos
- ✅ Tratamento adequado de precisão monetária (uso de inteiros para centavos)
- ✅ Health checks configurados para todos os serviços
- ✅ Configuração pronta para produção com variáveis de ambiente

## 📊 Arquitetura do Sistema

O sistema segue uma arquitetura de microserviços com:

1. **Separation of Concerns com DDD**:
   - Game Service: Lógica do jogo, rodadas, apostas, provably fair, WebSocket
   - Wallet Service: Gestão de carteiras, saldos, transações
   - Comunicação assíncrona via RabbitMQ para desacoplamento e resiliência

2. **Tecnologias-chave**:
   - **Backend**: NestJS com TypeScript strict mode, Prisma ORM
   - **Frontend**: React com Vite, Tailwind CSS, Zustand para estado do cliente
   - **Comunicação**: REST para operações críticas, WebSocket para updates em tempo real
   - **Autenticação**: Keycloak como provedor de identidade (JWT validation)
   - **Documentação**: Swagger UI gerado automaticamente via @nestjs/swagger
   - **Testes**: Bun test runner com cobertura de unitários e E2E

Desenvolvido como desafio técnico para posição de desenvolvedor full-stack.