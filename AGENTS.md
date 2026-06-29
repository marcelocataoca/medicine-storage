# MedicineStore — Contexto do Produto

Instruções de contexto para agentes de IA que trabalham neste repositório.

---

## Visão Geral

### Nome do Projeto

**MedicineStore**

### Descrição

Aplicativo para gerenciamento doméstico de medicamentos e controle de estoque pessoal.

### Objetivo de Negócio

O sistema tem como objetivo permitir que usuários adultos e idosos possam:

- Registrar medicamentos disponíveis em casa.
- Controlar quantidade em estoque.
- Controlar datas de validade.
- Receber notificações sobre medicamentos próximos do vencimento.
- Encontrar medicamentos já disponíveis no estoque antes de realizar novas compras.
- Organizar informações importantes sobre cada medicamento.
- Facilitar a gestão de remédios para uso pessoal e familiar.

O sistema deve ajudar o usuário a **utilizar melhor os medicamentos que já possui** antes de sugerir novas opções.

---

## Público-Alvo

### Perfis

- Adultos.
- Idosos.
- Pessoas com uso contínuo de medicamentos.
- Famílias que desejam controlar medicamentos domésticos.

### Princípios de Interface

As interfaces devem priorizar:

- Simplicidade.
- Legibilidade.
- Acessibilidade.
- Fontes de fácil leitura.
- Fluxos intuitivos.
- Poucos cliques para ações importantes.

---

## Estado Atual do Produto

### Autenticação

- Login de usuários.
- Firebase Authentication.

### Estoque de Medicamentos

- Listagem de medicamentos cadastrados.
- Visualização de quantidade disponível.
- Visualização de validade.

### Cadastro de Medicamentos

Cadastro contendo:

- Nome do medicamento.
- Código de barras.
- Leitura de código de barras via câmera.
- Observações.
- Finalidade do medicamento.
- Indicação de uso.
- Data de validade.
- Quantidade em estoque.

### Notificações

O sistema envia notificações de vencimento:

- 90 dias antes da validade.
- 45 dias antes da validade.

### Visão de Futuro

O sistema deverá evoluir para incluir:

- Sugestão inteligente baseada no estoque.
- Backend próprio em Node.js.
- Banco PostgreSQL.

---

## Regras Técnicas

Regras de implementação, arquitetura, segurança e padrões de código estão em `.cursor/rules/`. Consulte esses arquivos ao escrever ou modificar código.
