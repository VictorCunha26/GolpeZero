# GolpeZero

Assistente em português brasileiro para entender sinais de risco em mensagens, links e capturas de tela. A experiência tem três telas: análise, resultado e orientações. Cada resultado explica os sinais observados e indica ações que a pessoa pode tomar. O resultado sempre informa que a análise não confirma com certeza se o conteúdo é golpe.

## Rodar localmente

Use Node.js 22 ou 24 e npm.

```sh
npm ci
npm run dev
```

Abra `http://localhost:3000`. Para validar a instalação e o modo sem internet, use `npm run build` seguido de `npm start`.

## Configurar análise real

Copie `.env.example` para `.env.local` e preencha `OPENAI_API_KEY` com uma chave válida. O modelo padrão é `gpt-4.1-mini`. Se configurar `OPENAI_MODEL`, escolha um modelo que aceite imagens e Structured Outputs via Chat Completions. A variável é lida somente no servidor.

- Mensagens: até 5.000 caracteres.
- Endereços: HTTP ou HTTPS, até 2.048 caracteres. O endereço é enviado ao modelo como texto.
- Capturas: JPG, PNG ou WebP, até 4 MB e 20 megapixels. O servidor decodifica a imagem e envia uma cópia reduzida e sem metadados para análise. Imagens animadas são recusadas.
- A aplicação valida o resultado antes de mostrá-lo. Os próximos passos são selecionados de um catálogo em português. Nenhum percentual é exibido.

[Guia de respostas estruturadas da OpenAI](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=chat)

## Demonstração

Sem chave, abra **Experimentar exemplos**. Os quatro exemplos têm respostas prontas e explicitamente marcadas como demonstração. O formulário continua disponível para avaliar a interface e a validação. O serviço informa quando não há análise real configurada.

1. Pedido de Pix. Observe a troca de número e a orientação para falar com o contato conhecido.
2. Aviso de bloqueio. Observe a pressão para clicar e a indicação de confirmar por canal oficial.
3. Prêmio com taxa. Observe o pedido de pagamento adiantado.
4. Lembrete comum. Observe a avaliação de risco baixo e a ressalva de incerteza.

Com a chave configurada, os textos estão em `src/lib/demo.ts`. Use `tests/fixtures/print.png` para o caso sintético de imagem e `https://exemplo.invalid/regularizar` como endereço reservado para teste. Avaliações do provedor podem variar. Verifique se a explicação se apoia no conteúdo e as orientações fazem sentido para o caso.

Para o pitch, apresente o problema de decidir sob pressão. Abra o exemplo de Pix, mostre por que o resultado apareceu e navegue até a orientação. Ative o Modo Fácil e avance um passo por vez. Encerre com a frase do PDF: “O GolpeZero não decide por você. Ele traduz sinais de risco em uma orientação simples para que qualquer pessoa consiga agir com mais segurança.”

## Testes

```sh
npm test
npm run build
npm run typecheck
npm run test:e2e
```

O teste de navegador inicia o build de produção na porta 3077. No Windows, usa o Edge quando disponível. Em outros sistemas, instale Chromium com `npx playwright install chromium`. Use `TEST_BROWSER_EXECUTABLE` para escolher um caminho explícito. `TEST_BASE_URL` aponta a suíte para outro ambiente em modo demonstração. Execute a suíte em uma instância recém-iniciada por causa do limite de solicitações.

Os testes usam respostas sintéticas na simulação do provedor, fixtures reais de demonstração e o endpoint local para testar validação. Há verificações automatizadas do axe em cada tela. A síntese de voz depende do navegador, do sistema e das vozes disponíveis. Faça uma rodada manual com leitor de tela e um teste com uma pessoa que esteja usando o app pela primeira vez antes de considerar a avaliação de acessibilidade concluída.

## Publicar na Vercel

Importe o repositório ou execute `vercel` a partir da pasta do app. Use o preset **Next.js**, Node 24 e as configurações padrão de build. Configure `OPENAI_API_KEY` nas variáveis do projeto e faça um novo deploy. No celular, abra o endereço HTTPS, teste uma análise de cada tipo e instale o app pelo menu do navegador quando esse recurso estiver disponível. No Safari do iPhone, use **Compartilhar → Adicionar à Tela de Início**.

O limite é de 12 requisições por minuto por origem estimada e por instância. Ele protege a demonstração e é reiniciado quando a função é reciclada. Para uso público com credenciais pagas, configure também orçamento do provedor e limite no perímetro da Vercel.

## Privacidade

As entradas existem na memória durante o uso e são apagadas da interface depois de um resultado bem-sucedido. O GolpeZero não tem banco de dados, contas ou histórico. Só a preferência do Modo Fácil fica no armazenamento local da sessão. O serviço não registra o corpo nem inclui dados privados na URL. A análise real transmite conteúdo à OpenAI usando `store: false`. A retenção do provedor segue a política aplicável à conta. O modo offline guarda somente a página estática que informa a falta de internet.

[Controles e retenção de dados da API da OpenAI](https://developers.openai.com/api/docs/guides/your-data)

## Resultados verificados em 26 de novembro de 2026

- Build de produção e verificação TypeScript aprovados.
- 7 testes unitários e 9 testes de navegador aprovados. Incluem os quatro exemplos, envio pelos três formatos, validação, falhas e cancelamento, teclado, toque a 320 px, ampliação simulada de 200%, auditoria automatizada axe nas três telas, áudio simulado, manifesto e navegação offline.
- Verificação com chave fictícia confirmou sua ausência no HTML e em 11 arquivos públicos de build.
- A publicação HTTPS em [golpezero.vercel.app](https://golpezero.vercel.app) está ativa em modo demonstração. O teste público em viewport móvel percorreu o exemplo de Pix, conferiu a resposta da API, os passos do Modo Fácil, o manifesto e o registro do service worker.
- A integração multimodal foi testada com respostas simuladas. A verificação com a OpenAI depende de uma chave válida. Leitor de tela real, áudio no dispositivo, instalação em telefone físico e sessão com uma pessoa de primeira viagem ainda precisam de validação manual.

## Visão original

A [proposta original do projeto](docs/VISAO-ORIGINAL.md) descreve funcionalidades além do escopo desta versão do MVP.
