The floating bottom navigation on phones, with the add button to its right.

```html
<div class="fin-tabbar-wrap">
  <nav class="fin-tabbar" aria-label="Seções">
    <button class="fin-tab" aria-current="page"><svg>…</svg>Início</button>
    <button class="fin-tab"><svg>…</svg>Fluxo</button>
    <button class="fin-tab"><svg>…</svg>Cartões</button>
    <button class="fin-tab"><svg>…</svg>Casa</button>
  </nav>
  <button class="fin-btn fin-btn-fab" aria-label="Adicionar"><svg>…</svg></button>
</div>
```

You provide three to five destinations, each a 20px outline icon and a one-word label, and `aria-current="page"` on the active one.

- Fix the wrapper to the bottom of the viewport with `space-4` side gutters; leave `space-8` plus the bar's height of padding at the end of the page so content can scroll clear of it.
- The active tab is an `inverse` pill; never colour it `primary`, which is reserved for the FAB beside it.
- Phone only. On desktop the same destinations live in the sidebar.
