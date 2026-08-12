# План: скролл-баг (попытка 3), Hero — сильнее ужать текст и виджет

## Контекст
Пользователь подтверждает: правки текста (раунд 2) визуально применились, но:
1. Скролл вверх по клику на "Overview" всё ещё не работает (вперёд — работает, назад — нет).
2. Виджет Overview всё ещё заметно меньше, чем виджет Customize (тот теперь "на весь экран" — раунд 1/2 там сработали). Нужно уже и выше.

## Изменения

### 1. `components/Nav.tsx` — третья попытка скролла, другая техника измерения
Раунд 1 (`scrollIntoView`) и раунд 2 (`getBoundingClientRect().top + window.scrollY`) оба не дали видимого эффекта по словам пользователя. Вместо очередного варианта на основе `getBoundingClientRect()` (viewport-геометрия, вычисляется в момент клика, потенциально не совпадает по кадру с чем-то ещё), используем ту же технику, которой уже пользуется Framer Motion в этом самом проекте для измерения scroll-прогресса `position: sticky`-секций (см. `node_modules/framer-motion/dist/es/render/dom/scroll/*` — там позиция считается через цепочку `offsetTop`/`offsetParent`, а не через `getBoundingClientRect`, и это доказанно корректно работает с sticky в этом макете):

```ts
function getDocumentTop(el: HTMLElement) {
  let top = 0;
  let node: HTMLElement | null = el;
  while (node) {
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return top;
}

const scrollToId = (id: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
  e.preventDefault();
  const el = document.getElementById(id);
  if (!el) return;
  window.scrollTo({ top: getDocumentTop(el), behavior: prefersReducedMotion ? "auto" : "smooth" });
};
```
Остальное (7 ссылок, reduced-motion ветка) не менять.

### 2. `components/sections/Hero.module.css` — сильнее сжать текст и сузить виджет
Раунд 2 сжал текст недостаточно. Увеличиваем шаг:

```css
.content h1 {
  font-size: clamp(2rem, 3.5vw, 2.75rem);
}

.content .lede {
  font-size: 0.875rem;
  line-height: 1.5;
}
```
`.actions`: `margin-top` с `20px` → `14px`.
`.primary` и `.secondary` (эти классы локальные для Hero, конфликта каскада нет): `padding` с `13px 24px` → `11px 20px`.
`.visual`: `max-width` с `90%` → `78%`.

## Не трогать
Всё, что перечислено в предыдущих двух планах как out-of-scope, плюс: `.grow` в `sections.module.css` (не трогать — там уже верно, `align-items: stretch` + `width: 100%`), CustomizeSection (по словам пользователя сейчас выглядит хорошо, не трогать).

## Проверка
- [x] `npm run lint` чисто
- [x] `npm run build` чисто
- [x] В Nav.tsx не осталось `getBoundingClientRect`/`scrollIntoView` для скролла — только `getDocumentTop`+`window.scrollTo`
- [x] Все 7 ссылок используют новый обработчик
- [x] Hero.module.css: новые значения применены именно к `.content h1`/`.content .lede` (не к глобальным `h1`/`.body`)
