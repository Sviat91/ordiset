export type MasterId = "marek" | "anna";

export type DemoView =
  | { name: "home" }
  | { name: "master"; masterId: MasterId }
  | { name: "about" }
  | { name: "privacy" }
  | { name: "terms" }
  | { name: "help" };

export type BookedSlot = {
  masterId: MasterId;
  serviceId: string;
  dateISO: string;
  time: string;
};

export type DemoStore = {
  version: 1;
  seed: number;
  theme: "light" | "dark";
  bookings: BookedSlot[];
};

export type DemoState = {
  view: DemoView;
  history: DemoView[];
  store: DemoStore | null;
  locale: "en";
  draft: { serviceId: string | null; dateISO: string | null; time: string | null };
  confirmation: BookedSlot | null;
};

export type DemoAction =
  | { type: "hydrate"; store: DemoStore }
  | { type: "navigate"; view: DemoView }
  | { type: "back" }
  | { type: "toggleTheme" }
  | { type: "setLocale"; locale: string }
  | { type: "selectService"; serviceId: string }
  | { type: "selectDate"; dateISO: string }
  | { type: "selectTime"; time: string }
  | { type: "confirmBooking" }
  | { type: "closeConfirmation" };

export const initialState: DemoState = {
  view: { name: "home" },
  history: [],
  store: null,
  locale: "en",
  draft: { serviceId: null, dateISO: null, time: null },
  confirmation: null,
};

const HISTORY_LIMIT = 10;

function isNewMaster(current: DemoView, next: DemoView): boolean {
  if (next.name !== "master") return false;
  return current.name !== "master" || current.masterId !== next.masterId;
}

export function reducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case "hydrate":
      return { ...state, store: action.store };

    case "navigate": {
      const history = [...state.history, state.view].slice(-HISTORY_LIMIT);
      const draft = isNewMaster(state.view, action.view)
        ? { serviceId: null, dateISO: null, time: null }
        : state.draft;
      return { ...state, view: action.view, history, draft };
    }

    case "back": {
      const previous = state.history[state.history.length - 1];
      return {
        ...state,
        view: previous ?? { name: "home" },
        history: state.history.slice(0, -1),
      };
    }

    case "toggleTheme": {
      if (!state.store) return state;
      return {
        ...state,
        store: { ...state.store, theme: state.store.theme === "light" ? "dark" : "light" },
      };
    }

    case "setLocale":
      return action.locale === "en" ? { ...state, locale: "en" } : state;

    case "selectService":
      return { ...state, draft: { ...state.draft, serviceId: action.serviceId } };

    case "selectDate":
      return { ...state, draft: { ...state.draft, dateISO: action.dateISO, time: null } };

    case "selectTime":
      return { ...state, draft: { ...state.draft, time: action.time } };

    case "confirmBooking": {
      const { serviceId, dateISO, time } = state.draft;
      if (!state.store || state.view.name !== "master" || !serviceId || !dateISO || !time) {
        return state;
      }
      const slot: BookedSlot = { masterId: state.view.masterId, serviceId, dateISO, time };
      const bookings = [...state.store.bookings, slot].slice(-20);
      return {
        ...state,
        store: { ...state.store, bookings },
        confirmation: slot,
        draft: { serviceId: null, dateISO: null, time: null },
      };
    }

    case "closeConfirmation":
      return { ...state, confirmation: null };

    default:
      return state;
  }
}
