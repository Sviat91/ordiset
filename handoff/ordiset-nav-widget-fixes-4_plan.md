# План: скролл-баг (попытка 4) — вычисление через сумму высот, а не через положение

## Контекст
Ревью раунда 3 (`handoff/ordiset-nav-widget-fixes-3_plan.md`) не нашло дефекта в коде, но справедливо указало на риск: `offsetTop` для `position: sticky`-элемента (каждая `.card` в `StackSection`) теоретически может отражать *текущее визуальное* положение, а не стабильное статическое — то же самое подозрение, из-за которого сломался раунд 2 (`getBoundingClientRect`, который к тому же был испорчен CSS `transform: scale(...)` от Framer Motion). Это уже третья попытка через "прочитать положение целевого элемента" — пора перестать читать положение ЦЕЛИ вообще.

## Изменение

### `components/Nav.tsx` — цель = сумма высот предыдущих секций
Вместо измерения положения самой целевой секции, суммируем `offsetHeight` (layout-величина, не зависит ни от `position: sticky`, ни от CSS `transform`) всех секций, идущих ДО неё в `SECTION_IDS`. Это даёт абсолютную позицию начала целевой секции, вообще не читая её собственное текущее положение:

```ts
function getSectionTop(id: string): number {
  let top = 0;
  for (const sectionId of SECTION_IDS) {
    if (sectionId === id) break;
    const el = document.getElementById(sectionId);
    if (el) top += el.offsetHeight;
  }
  return top;
}

const scrollToId = (id: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
  e.preventDefault();
  window.scrollTo({ top: getSectionTop(id), behavior: prefersReducedMotion ? "auto" : "smooth" });
};
```
Удалить `getDocumentTop` (раунд 3) — он больше не нужен. Остальное (7 ссылок, reduced-motion) не менять.

## Не трогать
Все файлы/правила из предыдущих трёх планов, отмеченные как out-of-scope. `Hero.module.css` в этом раунде не трогать — эти правки уже применены в раунде 3.

## Проверка
- [x] `npm run lint` чисто
- [x] `npm run build` чисто
- [x] `getDocumentTop` удалён, используется `getSectionTop` + `offsetHeight`
- [x] Все 7 ссылок используют новый обработчик
- [x] `SECTION_IDS` не менялся по составу/порядку
