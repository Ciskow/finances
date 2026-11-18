One line of a list of bills, incomes or expenses: a round check, a label with optional detail, and the amount on the right.

```html
<label class="fin-row">
  <input type="checkbox" class="fin-check">
  <span class="fin-row-main">
    <span class="fin-row-label">Aluguel</span>
    <span class="fin-row-meta"><i class="fin-avatar fin-avatar-partner">E</i>Esposa · dia 01</span>
  </span>
  <span class="fin-row-amount">R$ 4.800,00<small>sua parte R$ 2.400,00</small></span>
</label>
```

You provide the label, the formatted amount, and the checkbox state (checked = paid or received). The meta line and the `small` second amount are optional.

- Stack rows directly; the hairline between them is built in and the last row has none.
- A checked row stays in place, struck through. Don't remove or reorder it on click.
- Use `fin-avatar` (you) or `fin-avatar-partner` with the person's initial to show who pays.
- For a read-only list, leave the checkbox out and keep the rest.
- Put a Badge after the label text for facts like "Parcela 3/10" or "estimado".
