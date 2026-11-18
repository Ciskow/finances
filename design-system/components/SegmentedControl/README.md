A two- or three-way switch between views of the same data.

```html
<div class="fin-seg" role="group" aria-label="Filtrar contas">
  <button class="fin-seg-item" aria-pressed="true">Todas</button>
  <button class="fin-seg-item" aria-pressed="false">Pendentes</button>
  <button class="fin-seg-item" aria-pressed="false">Pagas</button>
</div>
```

You provide the options (one word each where possible), an `aria-label` for the group, and `aria-pressed="true"` on exactly one item.

- Use it for filters ("Todas / Pendentes / Pagas") and for switching a basis ("Só meu salário / Salário do casal", "R$ / US$").
- It fills its container; give it a max-width when it sits alone.
- More than three options: use a select Field instead.
