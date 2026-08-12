# План: индикатор не возвращается при обратном скролле, виджеты разной ширины

## Контекст

### Проблема 1: индикатор при скролле вперёд работает, назад — нет
Текущий колбэк `IntersectionObserver` (`components/Nav.tsx`) перебирает `entries` и для каждой пересекающей вызывает `setActiveId(entry.target.id)` — последний вызов в цикле побеждает. Когда две секции одновременно пересекают центральную линию (`-50% 0px -50% 0px` rootMargin) в момент перехода, порядок обработки записей не гарантированно связан с направлением скролла, и на практике совпадает с движением "вперёд" (более поздняя по `SECTION_IDS` секция побеждает), но противоречит движению "назад" — там нужна БОЛЕЕ РАННЯЯ секция, а побеждает более поздняя. Это объясняет ровно ту асимметрию, которую описал пользователь.

Также сама техника "линия шириной 0" (`-50%/-50%` rootMargin) даёт `intersectionRatio`, по которому нельзя надёжно разрешать такие тай-брейки (площадь пересечения с нулевой по высоте областью вырождается).

**Фикс**: перестать полагаться на порядок `entries`/`intersectionRatio`. При каждом срабатывании observer'а (используем его только как триггер "что-то изменилось", не источник истины) — пересчитывать активную секцию заново: для всех `SECTION_IDS` читать `getBoundingClientRect()`, брать её видимую (на экране) середину и находить секцию, чья середина ближе всего к середине экрана. Для липких (`position: sticky`) карточек высотой `100svh`, которая сейчас закреплена, середина всегда точно совпадает с центром экрана (расстояние 0) — однозначный, направленно-симметричный результат.

### Проблема 2: виджет на Customize всё ещё шире, чем на Overview
`WindowChrome` в обоих местах вызывается идентично (`<WindowChrome />`, без пропсов) — это уже проверено дважды. Разница в ширине — не в компоненте, а в обёртке: у Hero обёртка виджета несёт ДВА класса (`heroStyles.visual` + `styles.grow`), и только `heroStyles.visual` ограничивает `max-width: 78%`; у Customize обёртка несёт ТОЛЬКО `styles.grow` (без ограничения ширины), поэтому виджет растягивается на всю доступную ширину контейнера.

**Фикс**: перенести `max-width: 78%` из Hero-специфичного `.visual` в общий `.grow` (`sections.module.css`), затем убрать `heroStyles.visual` из обёртки в `Hero.tsx` полностью — после этого разметка виджета в `Hero.tsx` и `CustomizeSection.tsx` станет буквально идентичной (`<div className={styles.grow}><WindowChrome /></div>` в обоих местах), а не просто "одинаковый компонент внутри разных обёрток".

## Изменения

### 1. `components/Nav.tsx` — пересчёт активной секции по геометрии, а не по порядку entries
```ts
function computeActiveId(): string | null {
  const center = window.innerHeight / 2;
  let bestId: string | null = null;
  let bestDist = Infinity;
  for (const id of SECTION_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= window.innerHeight) continue;
    const mid = rect.top + rect.height / 2;
    const dist = Math.abs(mid - center);
    if (dist < bestDist) {
      bestDist = dist;
      bestId = id;
    }
  }
  return bestId;
}
```
В колбэке `IntersectionObserver` — заменить текущий цикл по `entries` на:
```ts
(entries) => {
  if (suppressObserverRef.current) return;
  const id = computeActiveId();
  if (id) setActiveId(id);
}
```
(параметр `entries` в этом случае используется только как триггер вызова, сам объект можно не использовать — если ESLint ругается на неиспользуемый параметр, переименовать в `_entries` или убрать типизацию по необходимости). Сам `IntersectionObserver` (наблюдение за секциями, `rootMargin`, `observe`/`disconnect`) не менять — оставить как есть, он по-прежнему нужен как триггер пересчёта.

`suppressObserverRef`, `scrollend`-подписка, `scrollToId`, `getSectionTop` — не трогать, они уже работают верно (клики подтверждены пользователем).

### 2. `components/sections/sections.module.css` — расширить `.grow`
```css
.grow {
  flex: 1 1 0;
  min-height: 220px;
  width: 100%;
  max-width: 78%;
  display: flex;
  align-items: stretch;
  justify-content: center;
}
```

### 3. `components/sections/Hero.module.css` — убрать теперь полностью дублирующий `.visual`
Удалить правило `.visual { width: 100%; max-width: 78%; }` целиком — оно полностью повторяет то, что теперь даёт `.grow`.

### 4. `components/sections/Hero.tsx` — убрать `heroStyles.visual` из обёртки виджета
Было:
```tsx
<div className={`${heroStyles.visual} ${styles.grow}`}>
  <WindowChrome />
</div>
```
Стало:
```tsx
<div className={styles.grow}>
  <WindowChrome />
</div>
```
(теперь идентично обёртке в `CustomizeSection.tsx`). Убрать импорт `heroStyles` из Hero.tsx, если он после этого нигде больше не используется — проверить, используется ли `heroStyles` для чего-то ещё (`.root`, `.glow`, `.content`, `.actions`, `.primary`, `.secondary`, `.lede` — если хоть одно из них применяется в JSX, импорт остаётся, просто конкретно `heroStyles.visual` убирается из строки классов виджета).

## Не трогать
Всё из предыдущих планов, отмеченное как out-of-scope. `CustomizeSection.tsx` не менять — уже `<WindowChrome />` без пропсов, верно.

## Проверка
- [x] `npm run lint` чисто
- [x] `npm run build` чисто
- [x] `computeActiveId` корректно возвращает `null`, если ни одна секция не на экране (не должно быть краша)
- [x] Порядок перебора `entries` в колбэке observer'а больше не влияет на выбор активной секции
- [x] `.grow` (`sections.module.css`) теперь несёт `max-width: 78%`
- [x] `Hero.module.css` не содержит правила `.visual`
- [x] `Hero.tsx`: обёртка виджета — `<div className={styles.grow}>`, без `heroStyles.visual`; импорт `heroStyles` сохранён, только если используется где-то ещё в файле
- [x] Разметка обёртки виджета в `Hero.tsx` и `CustomizeSection.tsx` теперь текстуально идентична
