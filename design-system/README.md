# Finanças design system

A calm, light-first system for a household money app: white cards on a grey canvas, one blue for action, and large tabular amounts that do the talking.

## Content fundamentals

- Write the interface in Brazilian Portuguese, sentence case: "Contas a pagar", "Saldo previsto", "Marcar feito". Only the `overline` style is uppercase.
- Address the reader as "você". Name things the way the household does: "Nossa casa", "Nossa reserva", "Sua metade da casa".
- Format money as `R$ 5.304,28`: prefix, thin space, dot for thousands, comma for cents. Show US dollars as `US$ 1,234.56`.
- Prefix an estimated amount with `≈` and set it in `warning-ink`, or put an `estimate` Badge beside it. Never show an estimate as if it were final.
- A negative amount carries a minus sign (`− R$ 500,00`) as well as `danger-ink`. Colour alone never signals a sign or a status.
- Put the explanation under the number, in `caption`: "valor estimado após pagar todas as contas", "em 25 dias · 0 de 8 pagas".
- No emoji in the interface. Use an icon where a section needs a mark.

## Visual foundations

**Colour.** The page is `bg`; everything readable sits on a `surface` card. Use `primary` for exactly one thing per view: the action you want taken. Blue as text is `primary-ink`, never `primary`. `positive` and `positive-ink` mean money left over or within budget, and nothing else. `partner` belongs to the second person of the couple and always appears with their name or initial. `inverse` is for the active tab and the dark credit-card face.

**Type.** One family, Inter, loaded from Google Fonts in weights 400, 500, 600 and 700. Every screen has one `amount-xl` at most; cards lead with `amount-lg`; rows use `body` for the label and `body-strong` for the value. Set every amount with tabular numerals. The currency prefix and the cents are smaller and `ink-muted`, so the whole-number part reads first.

**Space and shape.** Cards have `radius-lg` corners and `space-6` padding (`space-5` on phones), with `space-4` between them. Controls use `radius-sm`; wells inside a card use `radius-md`; bars, badges and anything that floats use `radius-full`. Rows are separated by a 1px `border` hairline, never by alternating fills.

**Elevation.** Cards rest on `shadow-card`. Only the tab bar, the FAB, dialogs and toasts use `shadow-float`. Do not add borders to cards.

**States.** Hover darkens a neutral control to `surface-sunken` and brightens a filled one slightly. Focus is a 2px solid `focus` ring with a 2px offset on every interactive element. Disabled is 45% opacity. A paid bill keeps its place in the list with a struck-through `ink-muted` label and a `positive` check.

**Layout.** Desktop: a fixed 224px sidebar, a top bar with the MonthSwitcher, then a grid of cards, the hero balance spanning two columns. Phone: one column with `space-4` gutters, the TabBar floating at the bottom with the FAB to its right.

**Themes.** Light is the primary theme. Dark redefines every colour token; components never use a literal colour.

## Iconography

Outline icons, 1.75px stroke, round caps and joins, drawn on a 24px grid and coloured with `currentColor`: 20px in the TabBar, 18px in buttons, 16px inline. Lucide matches this style and is the set to pull from. Inside a card, an icon may sit in a 36px `primary-soft` tile with `radius-md` corners, drawn in `primary-ink`.

## Using it

Components are plain CSS classes prefixed `fin-`, in `components/bundle.css`. Load the tokens, then the bundle, and set `data-theme="light"` or `"dark"` on `<html>`. Each component's README lists its markup and what you supply.

| Need | Use |
| --- | --- |
| A headline number | Amount inside a Card |
| Where the salary goes, who pays what | BreakdownBar |
| A list of bills or entries to tick off | BillRow |
| Status of an invoice or entry | Badge |
| Month navigation | MonthSwitcher |
| Filter between two or three views | SegmentedControl |
| Phone navigation | TabBar |
| Forms in dialogs | Field and Button |
