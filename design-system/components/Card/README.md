The white surface every piece of content sits on.

```html
<section class="fin-card">
  <div class="fin-card-head">
    <h3 class="fin-card-title">Contas a pagar</h3>
    <span class="fin-card-sub">dia 05</span>
  </div>
  …
  <p class="fin-overline">Próximas faturas</p>
  <div class="fin-well">…</div>
</section>
```

You provide a short title, optionally a `fin-card-sub` qualifier beside it, and the content. The card sets no width: place it in a grid with `space-4` gaps.

- Lead with the title, then one Amount, then the detail. One subject per card.
- Use `fin-well` for a sunken block inside a card (an editable salary row, an inactive tile) and `fin-overline` to label a sub-section.
- On phones reduce the padding to `space-5`.
- Don't nest a card in a card, and don't add a border: `shadow-card` and the `bg` canvas already separate it.
