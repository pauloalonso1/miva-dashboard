# Miva Dashboard — Setup do Backend

## 1. Neon.tech (banco de dados)

1. Acesse https://console.neon.tech e crie um projeto
2. Copie a **Connection String** (formato: `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`)
3. Cole em `.env.local`:
   ```
   DATABASE_URL=postgresql://user:pass@ep-xxx...
   ```

## 2. Nuvemshop (e-commerce)

1. Acesse https://partners.nuvemshop.com.br e crie um app parceiro
2. Configure o **Redirect URI** como: `http://localhost:3000/api/nuvemshop/callback`
3. Copie **Client ID** e **Client Secret** para `.env.local`:
   ```
   NUVEMSHOP_CLIENT_ID=seu_client_id
   NUVEMSHOP_CLIENT_SECRET=seu_client_secret
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

## 3. Criar as tabelas no banco

```bash
# Gerar os arquivos SQL de migration
npm run db:generate

# Aplicar as migrations no Neon
npm run db:push
```

## 4. Iniciar o servidor

```bash
npm run dev
```

Acesse: http://localhost:3000
(Redireciona para `/index.html` que é o dashboard)

## 5. Popular com dados de demonstração (opcional)

```bash
curl -X POST http://localhost:3000/api/seed
```

## 6. Conectar Nuvemshop

Acesse: http://localhost:3000/api/nuvemshop/auth

Isso vai redirecionar para a tela de autorização da Nuvemshop.
Após autorizar, o token é salvo automaticamente no banco.

## 7. Sincronizar produtos e pedidos

```bash
# Importar produtos do catálogo Nuvemshop
curl -X POST http://localhost:3000/api/nuvemshop/sync/produtos

# Importar pedidos pagos (últimas 200 vendas)
curl -X POST http://localhost:3000/api/nuvemshop/sync/pedidos \
  -H "Content-Type: application/json" \
  -d '{"paginas": 2}'
```

## Rotas da API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/produtos | Lista produtos |
| POST | /api/produtos | Cria produto |
| PUT | /api/produtos/[id] | Atualiza produto / ajusta estoque |
| DELETE | /api/produtos/[id] | Remove produto |
| GET | /api/vendas | Lista vendas |
| POST | /api/vendas | Registra venda (baixa estoque automaticamente) |
| DELETE | /api/vendas/[id] | Exclui venda (estorna estoque automaticamente) |
| GET | /api/clientes | Lista clientes |
| GET | /api/nuvemshop/auth | Inicia OAuth Nuvemshop |
| GET | /api/nuvemshop/callback | Callback OAuth (automático) |
| GET | /api/nuvemshop/status | Verifica conexão |
| POST | /api/nuvemshop/sync/produtos | Importa produtos |
| POST | /api/nuvemshop/sync/pedidos | Importa pedidos |
| POST | /api/seed | Popula dados de demo (apenas banco vazio) |
