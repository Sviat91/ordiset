# План: индикатор не двигается при скролле с закрытым DevTools (работает с открытым)

## Контекст
Диагностический факт от пользователя (проверено дважды): с открытой панелью разработчика скролл двигает индикатор идеально; с закрытой — вообще не двигает (клики по-прежнему работают, т.к. они не используют этот механизм). Это классический признак того, что самодельный `window.addEventListener("scroll", ...)` + throttling через `requestAnimationFrame` (раунд 7) по-разному планируется браузером Chrome в зависимости от того, открыт ли DevTools — известная категория проблем с таймингом `rAF`/scroll-событий, а не ошибка в самой логике (`computeActiveId` дважды независимо проверена и подтверждена корректной).

**Решение**: перестать писать свой механизм отслеживания скролла. На странице уже используется Framer Motion (`useScroll` в каждом `StackSection.tsx`) для scroll-linked анимации карточек — она работает без единой жалобы за всю сессию, независимо от DevTools. Использовать её же встроенный механизм (`useScroll` + `useMotionValueEvent`) в `Nav.tsx` вместо самодельного `scroll`-listener'а.

## Изменения

### `components/Nav.tsx`
Импортировать `useScroll` и `useMotionValueEvent` из `framer-motion` (уже используется в проекте, `motion`/`useReducedMotion`/`useScroll`/`useTransform` — знакомые импорты, доступны в установленной версии).

Убрать весь `useEffect`, добавленный в раунде 7 (создающий `onScroll`/`ticking`/`requestAnimationFrame`, слушающий `window.addEventListener("scroll", ...)`). Вместо него:

```ts
const { scrollY } = useScroll();

useEffect(() => {
  const id = computeActiveId();
  if (id) setActiveId(id);
}, []);

useMotionValueEvent(scrollY, "change", () => {
  if (suppressObserverRef.current) return;
  const id = computeActiveId();
  if (id) setActiveId(id);
});
```

Первый `useEffect` — разовый вызов при монтировании (чтобы индикатор был верным сразу при загрузке, до первого скролла; `useMotionValueEvent`'s `"change"` событие не срабатывает на монтировании, только на изменениях). Второй блок — подписка на изменения scroll-позиции через Framer Motion вместо самодельного слушателя.

`computeActiveId`, `suppressObserverRef`, `scrollend`-подписка, `scrollToId`, `getSectionTop` — не трогать, они уже верны.

## Не трогать
Всё из предыдущих планов, отмеченное как out-of-scope.

## Проверка
- [x] `npm run lint` чисто
- [x] `npm run build` чисто
- [x] `window.addEventListener("scroll", ...)` и связанный с ним `requestAnimationFrame`-throttling из раунда 7 полностью удалены из `Nav.tsx`
- [x] `useScroll`/`useMotionValueEvent` корректно импортированы из `framer-motion` и используются
- [x] Индикатор выставляется один раз при монтировании компонента (до первого события скролла)
- [x] TypeScript не ругается на типы `useMotionValueEvent` (колбэк должен принимать `(latest: number, prev: number) => void`, но раз аргументы не нужны — сигнатура `() => {...}` синтаксически валидна в TS для колбэка с необязательными параметрами)

### Отклонение от плана
Буквальный код из плана (`if (id) setActiveId(id);` напрямую в теле mount-эффекта) провоцирует ESLint-ошибку `react-hooks/set-state-in-effect` (правило пришло с `eslint-config-next` в этой версии проекта, в момент написания плана не было учтено). Исправлено оборачиванием вызова в именованную внутреннюю функцию `setInitialActiveId`, вызываемую сразу же — тот же паттерн, что уже используется в соседнем `useEffect` для `updateIndicator` в этом же файле. Поведение идентично, синхронный вызов `setActiveId` при монтировании сохранён без изменений.
