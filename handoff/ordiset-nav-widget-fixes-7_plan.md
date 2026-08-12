# План: индикатор не двигается при обычном скролле (клики работают)

## Контекст
Клики по ссылкам двигают индикатор верно (это отдельный путь — `scrollToId` вызывает `setActiveId` напрямую, без участия observer'а). Обычный скролл (колесо мыши/трекпад) — вообще не двигает индикатор, ни вперёд, ни назад. Раз оба направления сломаны одинаково, дело не в `computeActiveId` (та же функция теперь используется и там, и там бы отражала обе стороны одинаково), а в том, что колбэк `IntersectionObserver` попросту не срабатывает достаточно надёжно при обычном скролле.

Причина: техника `rootMargin: "-50% 0px -50% 0px"` схлопывает область наблюдения в линию нулевой высоты. Это нестандартный, плохо документированный паттерн — за последние несколько раундов именно вокруг него была вся нестабильность индикатора. Пора перестать чинить IntersectionObserver и заменить его на прямой, предсказуемый механизм: слушатель события `scroll` (throttled через `requestAnimationFrame`), который на каждый кадр скролла напрямую вызывает `computeActiveId()` — ту же самую геометрическую функцию, что уже работает верно (проверено для кликов).

## Изменения

### `components/Nav.tsx` — заменить IntersectionObserver на scroll-listener с rAF-throttlingом
Убрать весь `useEffect`, создающий `IntersectionObserver` (наблюдение за `SECTION_IDS`, `rootMargin`, `observe`/`disconnect`). Вместо него:

```ts
useEffect(() => {
  let ticking = false;
  const updateActiveId = () => {
    ticking = false;
    if (suppressObserverRef.current) return;
    const id = computeActiveId();
    if (id) setActiveId(id);
  };
  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateActiveId);
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  updateActiveId();
  return () => window.removeEventListener("scroll", onScroll);
}, []);
```

`computeActiveId`, `suppressObserverRef`, `scrollend`-подписка, `scrollToId`, `getSectionTop` — не трогать, они уже верны. `computeActiveId` должна определяться выше этого эффекта (как сейчас).

## Не трогать
Всё из предыдущих планов, отмеченное как out-of-scope. `sections.module.css`, `Hero.module.css`, `Hero.tsx`, `CustomizeSection.tsx` — в этом раунде не трогать, там всё уже верно.

## Проверка
- [x] `npm run lint` чисто
- [x] `npm run build` чисто
- [x] `IntersectionObserver` полностью удалён из `Nav.tsx` (grep подтверждает отсутствие)
- [x] Слушатель `scroll` подписан с `{ passive: true }` и throttled через `requestAnimationFrame` (не более одного вызова `computeActiveId` за кадр)
- [x] `updateActiveId()` вызывается один раз при монтировании (чтобы индикатор был верным сразу при загрузке страницы, до первого скролла)
- [x] Слушатель корректно снимается в cleanup-функции эффекта
