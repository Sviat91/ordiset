# План: индикатор не синхронизируется после клика, отступы у кнопок, Customize должен выглядеть как Overview

## Контекст
Скролл (раунд 4) работает — подтверждено пользователем. Остались три проблемы:
1. При органическом скролле линия-индикатор двигается верно. При клике по ссылке (программный `window.scrollTo`) страница долетает до нужной секции, но линия остаётся на предыдущей активной ссылке. Причина: `IntersectionObserver` — асинхронный, батчащийся API; он не гарантированно успевает/корректно отследить пересечения во время быстрого программного прыжка через несколько секций разом (в отличие от плавного ручного скролла, где он видит каждый переход).
2. Отступы вокруг кнопок (`.actions`) и до превью-виджета нужно уменьшить примерно вдвое от текущих значений.
3. `CustomizeSection`'s `WindowChrome` до сих пор выглядит иначе, чем Hero'вский (из-за `chip="admin.ordiset.com"` — адресной плашки, которой у Hero больше нет). Нужно, чтобы оба виджета выглядели идентично.

## Изменения

### 1. `components/Nav.tsx` — синхронизация индикатора при клике
Добавить: (a) оптимистичное обновление `activeId` прямо в обработчике клика, (b) флаг-ref, подавляющий обновления от `IntersectionObserver` на время программного скролла, снимаемый по нативному событию `scrollend` (плюс `setTimeout`-подстраховка на случай браузеров без поддержки `scrollend` или редких пропущенных событий).

```ts
const suppressObserverRef = useRef(false);

useEffect(() => {
  const onScrollEnd = () => { suppressObserverRef.current = false; };
  window.addEventListener("scrollend", onScrollEnd);
  return () => window.removeEventListener("scrollend", onScrollEnd);
}, []);
```

В обработчике IntersectionObserver (существующий `useEffect` с `new IntersectionObserver(...)`) — первой строкой колбэка добавить:
```ts
(entries) => {
  if (suppressObserverRef.current) return;
  for (const entry of entries) {
    if (entry.isIntersecting) setActiveId(entry.target.id);
  }
}
```

В `scrollToId`:
```ts
const scrollToId = (id: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
  e.preventDefault();
  suppressObserverRef.current = true;
  setActiveId(id);
  window.scrollTo({ top: getSectionTop(id), behavior: prefersReducedMotion ? "auto" : "smooth" });
  window.setTimeout(() => { suppressObserverRef.current = false; }, 1000);
};
```
(таймаут — подстраховка; если `scrollend` придёт раньше, он и снимет флаг раньше, значение true→false повторно не проблема).

### 2. `components/sections/Hero.module.css` — уменьшить отступы примерно вдвое
`.actions` `margin-top`: `14px` → `7px`.

Добавить новое, Hero-специфичное правило (переопределяет общий отступ перед виджетом из `sections.module.css` `.stack > *:last-child`, используя составной селектор `.content.stack`, специфичность (0,3,0) — заведомо выше общего (0,2,0), порядок подключения файлов не важен; `Hero.tsx` уже вешает ОБА класса `heroStyles.content` и `styles.stack` на один и тот же div):
```css
.content.stack > *:last-child {
  margin-top: clamp(12px, 2vw, 24px);
}
```

### 3. `components/sections/CustomizeSection.tsx` — убрать chip, полностью повторить вызов Hero
```tsx
<WindowChrome />
```
(убрать `chip="admin.ordiset.com"` целиком — теперь оба виджета вызываются одинаково, без пропсов, оба используют общий дефолт "Preview coming soon" без адресной плашки).

## Не трогать
Всё из предыдущих планов, отмеченное как out-of-scope. `WindowChrome.tsx`/`.module.css` не менять — там уже всё правильно устроено (chip рендерится только если передан).

## Проверка
- [x] `npm run lint` чисто
- [x] `npm run build` чисто
- [x] Клик по ссылке сразу переставляет `activeId`, индикатор не ждёт `IntersectionObserver`
- [x] `suppressObserverRef` корректно снимается и по `scrollend`, и по таймауту (какое раньше)
- [x] `.content.stack > *:last-child` — специфичность строго выше `.stack > *:last-child` из `sections.module.css`
- [x] `CustomizeSection.tsx` рендерит `<WindowChrome />` без пропсов, идентично `Hero.tsx`
