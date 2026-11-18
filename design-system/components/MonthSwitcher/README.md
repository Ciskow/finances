The month the whole screen is about, with previous and next buttons.

```html
<div class="fin-month">
  <button class="fin-btn fin-btn-ghost fin-btn-icon" aria-label="Mês anterior"><svg>…</svg></button>
  <button class="fin-btn fin-btn-ghost fin-btn-icon" aria-label="Próximo mês"><svg>…</svg></button>
  <button class="fin-month-title">dezembro <span class="fin-month-year">2026</span><svg>…</svg></button>
</div>
```

You provide the month name and year (the title capitalises the month), and handlers for the three buttons. The title opens a month picker.

- Place it at the left of the top bar on desktop and directly under the app header on phones.
- The year is `ink-faint` and regular weight so the month reads first.
- Disable a chevron (`disabled`) when there is no data in that direction.
