A labelled input or select for dialogs and inline edits.

```html
<div class="fin-field">
  <label class="fin-label" for="valor">Valor</label>
  <input class="fin-input fin-input-money" id="valor" inputmode="decimal" placeholder="0,00">
  <span class="fin-hint">Em reais</span>
</div>
```

You provide the label text, a matching `for`/`id` pair, and the control (`input`, `select` or `textarea` with class `fin-input`). The hint is optional.

- Add `fin-input-money` to right-align an amount in tabular numerals.
- For an error, add `fin-field-error` to the wrapper and write in the hint what to change ("Informe um dia entre 1 e 31").
- Lay fields out in a two-column grid with `space-3` gaps; description fields span both columns.
- Don't use the placeholder as the label.
