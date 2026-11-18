The action control: one `fin-btn-primary` per view, everything else secondary or ghost.

```html
<button class="fin-btn fin-btn-primary">+ Adicionar</button>
<button class="fin-btn">Ver fatura</button>
<button class="fin-btn fin-btn-ghost">Cancelar</button>
<button class="fin-btn fin-btn-danger">Excluir</button>
<button class="fin-btn fin-btn-icon" aria-label="Mês anterior"><svg>…</svg></button>
<button class="fin-btn fin-btn-fab" aria-label="Adicionar"><svg>…</svg></button>
```

You provide the label (a verb, sentence case) and, for `fin-btn-icon` and `fin-btn-fab`, an `aria-label` and a 24px-grid outline icon.

- Use `fin-btn-primary` for the single action the view exists for; the default (secondary) for the rest; `fin-btn-ghost` for dismissals inside dialogs.
- Use `fin-btn-danger` only for the confirming step of a deletion.
- `fin-btn-fab` is the phone "add" action and sits to the right of the TabBar. Do not use it on desktop; the top bar's primary button does that job.
- Don't put two primary buttons in one card.
