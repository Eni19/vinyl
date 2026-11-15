# Portfólio + currículo

Um site que é ao mesmo tempo portfólio visual e gerador de currículos. Você cadastra competências, projetos e experiências uma vez só. O site mostra tudo como portfólio, e para cada vaga você escolhe o que é relevante e gera um currículo sob medida, em português ou inglês.

Ele começa com um único dono (Enrique Susin), mas o modelo de dados e a arquitetura já estão prontos para várias pessoas.

## Rodando

```bash
pnpm install
pnpm dev          # http://localhost:3000 → redireciona para /pt ou /en
pnpm check        # lint + typecheck + testes
pnpm build
```

## Arquitetura

```
content/                 conteúdo de cada portfólio (JSON validado por Zod)
  enrique-susin/portfolio.json
  index.ts               registro slug → conteúdo
src/
  domain/                regras puras, sem React nem I/O
    i18n/                locales, negociação de idioma, textos localizados
    entities/            schemas Zod + tipos (Profile, Skill, Project, …)
    resume/              seleção por vaga → currículo (buildResume)
  application/ports/     interfaces (PortfolioRepository)
  infrastructure/        implementações + composition root (container.ts)
  app/[lang]/            rotas Next.js, dicionários de UI
  ui/records/            a estante: catálogo de discos (testado), cena 3D, capas, encartes
  ui/panels/             blocos de HTML compartilhados (links, skills, destaques)
  proxy.ts               redireciona "/" para o idioma do visitante
```

**Os mesmos dados viram duas saídas.** O `Portfolio` é a fonte única. As páginas leem dele, e `buildResume(portfolio, selection)` produz o currículo de uma vaga, já traduzido e na ordem escolhida.

**A troca de armazenamento acontece em um só arquivo.** Hoje o `StaticPortfolioRepository` lê os JSONs do repositório. Quando houver vários usuários, entra um repositório de banco que implementa a mesma interface, trocado em `src/infrastructure/container.ts`.

**Idiomas.** Todo texto de conteúdo é `{ pt, en }`. O `pt` é obrigatório e o `en` cai para `pt` enquanto não for traduzido. Um teste falha se algum texto do conteúdo real estiver sem tradução.

## Testes

Vitest, com os testes ao lado do código (`*.test.ts`). O foco está em `domain/` e `infrastructure/`. O arquivo `content/content.test.ts` valida o conteúdo real, então um erro de digitação no JSON quebra o CI e não o site.

## Editando o conteúdo

Edite `content/<slug>/portfolio.json`. IDs em kebab-case. Projetos, experiências e publicações referenciam skills por `skillIds`, e o schema rejeita referências inexistentes. Contatos com `"showOnSite": false` (como o telefone) aparecem só no currículo.

## Roadmap

- [x] **Fase 0, fundação:** Next 16, TypeScript, Tailwind 4, Zod, Vitest, CI, domínio e conteúdo PT/EN
- [x] **Fase 1, portfólio visual:** estante de discos 3D com toca-discos (React Three Fiber), encartes com lados A/B, páginas de projeto
- [ ] **Fase 2, montador de currículo:** seleção, preview ao vivo, PDF (@react-pdf/renderer), variantes salvas por vaga
- [ ] **Fase 3, vários usuários:** auth, Postgres, painel de edição, `/[usuario]`
- [ ] **Fase 4, extras:** sugestão de skills e projetos a partir da descrição da vaga, import/export JSON Resume

## Design

O visual segue as skills `impeccable`, `design-taste-frontend` e `emil-design-eng`. O produto está descrito em `PRODUCT.md`, e as fotos de referência (o quarto e os desenhos) ficam em `design/references/`.

- **A estante de discos:** a home é um móvel de discos em 3D (React Three Fiber) com um toca-discos em cima. Cada projeto e cada tema é um disco, com capa, contracapa (lista de faixas), lombada e selo, todos gerados a partir dos dados (`src/ui/records/catalog.ts`).
- **Interação:** passar o mouse puxa o disco. Clicar coloca o vinil no toca-discos e abre o encarte com lado A e lado B (`src/ui/records/LinerNotes.tsx`).
- **Toca-discos:** "Modern vinyl player", de alpaca. (Sketchfab, CC BY 4.0), comprimido com glTF-Transform e meshopt (`public/models/turntable.glb`). O crédito aparece na página.
- **Sem WebGL ou sem JavaScript:** os discos viram capas em HTML e os encartes aparecem como página comum.
- **Direção anterior:** o quadro de post-its continua guardado no branch `design/quadro`.
