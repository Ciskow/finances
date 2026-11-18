A small pill that names the state of an invoice, bill or amount.

```html
<span class="fin-badge fin-badge-info">Aberta</span>
<span class="fin-badge fin-badge-estimate">estimado</span>
<span class="fin-badge fin-badge-positive">Paga</span>
<span class="fin-badge fin-badge-danger">Atrasada</span>
<span class="fin-badge">Parcela 3/10</span>
<span class="fin-count">10</span>
```

You provide one or two words. The word carries the meaning; the tone only reinforces it.

- `info`: an open invoice. `estimate`: a value that is not final yet (pair with ≈ on the amount). `positive`: paid or received. `danger`: overdue. No modifier: neutral facts such as an instalment count, a currency or "recorrente".
- `fin-count` is the unread count on the bell; position it on the top-right corner of its button.
- Don't use a badge as a button, and don't stack more than two on a row.
