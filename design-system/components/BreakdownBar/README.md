A segmented bar that shows how one total divides, with a legend that repeats every share in words and numbers.

```html
<div class="fin-bar" role="img" aria-label="Salário: 27% casa, 52% contas pessoais, 2% dia a dia, 19% sobra">
  <span class="fin-bar-seg fin-tone-deep" style="flex:27"></span>
  <span class="fin-bar-seg fin-tone-primary" style="flex:52"></span>
  <span class="fin-bar-seg fin-tone-neutral" style="flex:2"></span>
  <span class="fin-bar-seg fin-tone-positive" style="flex:19"></span>
</div>
<ul class="fin-legend">
  <li><span class="fin-legend-label"><i class="fin-dot fin-tone-deep"></i>Sua metade da casa</span>
      <span class="fin-legend-value">− R$ 7.666,22 <small>27%</small></span></li>
  …
</ul>
```

You provide each segment's share as its `flex` value, a tone class, an `aria-label` that states the split, and one legend item per segment.

- Tones: `fin-tone-deep`, `fin-tone-primary`, `fin-tone-neutral`, `fin-tone-positive` (always the leftover, always last), `fin-tone-partner`.
- Add `fin-bar-labeled` for the two-person split: a taller bar with each percentage written inside its segment. Use only `primary` and `partner` there, and name both people above it.
- Every segment needs its legend item; the bar is never the only place a value appears.
- Four segments at most. Group the rest into one.
