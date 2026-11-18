A money value with the whole-number part emphasised and the currency prefix and cents set smaller in `ink-muted`.

```html
<span class="fin-amount fin-amount-xl">
  <span class="fin-amount-cur">R$</span><span>5.304</span><span class="fin-amount-dec">,28</span>
</span>
```

You provide the value already formatted for pt-BR, split into three spans: prefix, integer part, and cents including the comma.

- Sizes: `fin-amount-xl` (one per screen, the hero balance), `fin-amount-lg` (the total leading a card), `fin-amount-md` (totals inside a card and on phones). Row values are not an Amount; use `body-strong` with the `fin-num` class.
- Tones: `fin-amount-positive` for money left over, `fin-amount-negative` for a deficit (put a minus sign before the prefix), `fin-amount-estimate` for a value that is not final (put ≈ before the prefix).
- Always follow it with a `caption` line that says what the number is.
