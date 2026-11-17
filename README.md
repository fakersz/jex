# JEX - Assistente Virtual Pessoal Modular

JEX é um assistente virtual pessoal modular construído com React, TypeScript e Vite, containerizado em Docker para execução local rápida e isolada.

## 🚀 Como Executar o Projeto

### Pré-requisitos
- [Docker](https://www.docker.com/) e Docker Compose instalados no sistema.

### 1. Iniciar a aplicação
Para construir a imagem Docker e subir o container em segundo plano:
```bash
docker compose up -d --build
```
Acesse a aplicação no navegador em: **[http://localhost:5173](http://localhost:5173)**

### 2. Visualizar Logs
Para acompanhar os logs do container em tempo real:
```bash
docker compose logs -f
```

### 3. Reconstruir a imagem
Se alterar arquivos de configuração ou dependências:
```bash
docker compose build --no-cache
docker compose up -d
```

### 4. Parar a aplicação
Para interromper os containers em execução:
```bash
docker compose down
```

---

## 🛠️ Tecnologias e Arquitetura Visual
- **React 18** + **TypeScript**
- **Vite** (Dev Server com HMR em `0.0.0.0:5173`)
- **Docker** + **Docker Compose**
- **CSS Puro** com Variáveis Globais, suporte a Glassmorphism e Tema Escuro Futurista
