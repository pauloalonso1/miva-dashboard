import {
  pgTable,
  text,
  numeric,
  integer,
  timestamp,
  serial,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const produtos = pgTable('produtos', {
  id:                  text('id').primaryKey(),
  nome:                text('nome').notNull(),
  referencia:          text('referencia').notNull(),
  tipoBanho:           text('tipo_banho').notNull(),
  custo:               numeric('custo', { precision: 10, scale: 2 }).notNull(),
  preco:               numeric('preco', { precision: 10, scale: 2 }).notNull(),
  estoque:             integer('estoque').notNull().default(0),
  fornecedor:          text('fornecedor'),
  imagemUrl:           text('imagem_url'),
  nuvemshopProductId:  text('nuvemshop_product_id'),
  createdAt:           timestamp('created_at').defaultNow().notNull(),
  updatedAt:           timestamp('updated_at').defaultNow().notNull(),
});

export const vendas = pgTable('vendas', {
  id:               text('id').primaryKey(),
  data:             timestamp('data').notNull(),
  canal:            text('canal').notNull(),       // 'cidade' | 'online'
  pagamento:        text('pagamento').notNull(),
  parcelas:         integer('parcelas').notNull().default(1),
  valorBruto:       numeric('valor_bruto',   { precision: 10, scale: 2 }).notNull(),
  custoTotal:       numeric('custo_total',   { precision: 10, scale: 2 }).notNull(),
  taxa:             numeric('taxa',          { precision: 6,  scale: 4 }).notNull(),
  valorLiquido:     numeric('valor_liquido', { precision: 10, scale: 2 }).notNull(),
  lucro:            numeric('lucro',         { precision: 10, scale: 2 }).notNull(),
  clienteNome:      text('cliente_nome'),
  nuvemshopOrderId: text('nuvemshop_order_id'),
  createdAt:        timestamp('created_at').defaultNow().notNull(),
});

export const itensVenda = pgTable('itens_venda', {
  id:            serial('id').primaryKey(),
  vendaId:       text('venda_id').notNull().references(() => vendas.id, { onDelete: 'cascade' }),
  produtoId:     text('produto_id').notNull(),
  nome:          text('nome').notNull(),
  quantidade:    integer('quantidade').notNull(),
  precoUnitario: numeric('preco_unitario', { precision: 10, scale: 2 }).notNull(),
  custoUnitario: numeric('custo_unitario', { precision: 10, scale: 2 }).notNull(),
});

export const clientes = pgTable('clientes', {
  id:                   text('id').primaryKey(),
  nome:                 text('nome').notNull().unique(),
  telefone:             text('telefone').default(''),
  cidade:               text('cidade').default(''),
  totalGasto:           numeric('total_gasto', { precision: 10, scale: 2 }).default('0').notNull(),
  compras:              integer('compras').default(0).notNull(),
  nuvemshopCustomerId:  text('nuvemshop_customer_id'),
  createdAt:            timestamp('created_at').defaultNow().notNull(),
  updatedAt:            timestamp('updated_at').defaultNow().notNull(),
});

export const nuvemshopTokens = pgTable('nuvemshop_tokens', {
  id:           serial('id').primaryKey(),
  storeId:      text('store_id').notNull().unique(),
  accessToken:  text('access_token').notNull(),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
  updatedAt:    timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const vendasRelations = relations(vendas, ({ many }) => ({
  itens: many(itensVenda),
}));

export const itensVendaRelations = relations(itensVenda, ({ one }) => ({
  venda: one(vendas, { fields: [itensVenda.vendaId], references: [vendas.id] }),
}));
